import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildGoogleUsageSpikeEnvelope,
  type ExploratoryGoogleUsageSpike,
} from '../src/lib/integrations/google'
import {
  getGoogleUsageSpikeReportPayload,
  isGoogleUsageSpikeRouteEnabled,
  loadGoogleUsageSpikeRoutePayload,
} from '../src/lib/reports/google-usage-spike'

interface SupabaseStubOptions {
  userId?: string | null
  companyId?: string | null
  report?: { id: string; job_id: string | null } | null
  usageOutput?: unknown
}

function createSupabaseStub({
  userId = 'user-1',
  companyId = 'company-1',
  report = { id: 'report-1', job_id: 'job-1' },
  usageOutput,
}: SupabaseStubOptions = {}) {
  const queries: Array<{
    table: string
    columns: string
    filters: Record<string, unknown>
  }> = []

  return {
    queries,
    client: {
      auth: {
        async getUser() {
          return {
            data: {
              user: userId ? { id: userId } : null,
            },
          }
        },
      },
      from(table: string) {
        return {
          select(columns: string) {
            const filters: Record<string, unknown> = {}

            return {
              eq(column: string, value: unknown) {
                filters[column] = value
                return this
              },
              async single() {
                queries.push({ table, columns, filters: { ...filters } })

                if (table === 'companies') {
                  return {
                    data: companyId ? { id: companyId } : null,
                    error: null,
                  }
                }

                throw new Error(`single() not implemented for ${table}`)
              },
              async maybeSingle() {
                queries.push({ table, columns, filters: { ...filters } })

                if (table === 'reports') {
                  return {
                    data: report,
                    error: null,
                  }
                }

                if (table === 'agent_outputs') {
                  return {
                    data: usageOutput === undefined ? null : { output: usageOutput },
                    error: null,
                  }
                }

                throw new Error(`maybeSingle() not implemented for ${table}`)
              },
            }
          },
        }
      },
    },
  }
}

test('isGoogleUsageSpikeRouteEnabled follows the dev-or-flag rule', () => {
  assert.equal(
    isGoogleUsageSpikeRouteEnabled({ NODE_ENV: 'development' } as NodeJS.ProcessEnv),
    true
  )
  assert.equal(
    isGoogleUsageSpikeRouteEnabled({
      NODE_ENV: 'production',
      ENABLE_GOOGLE_USAGE_SPIKE: 'false',
    } as NodeJS.ProcessEnv),
    false
  )
  assert.equal(
    isGoogleUsageSpikeRouteEnabled({
      NODE_ENV: 'production',
      ENABLE_GOOGLE_USAGE_SPIKE: 'true',
    } as NodeJS.ProcessEnv),
    true
  )
})

test('loadGoogleUsageSpikeRoutePayload returns unauthorized when no user session exists', async () => {
  const { client, queries } = createSupabaseStub({
    userId: null,
  })

  const result = await loadGoogleUsageSpikeRoutePayload(client, 'report-1')

  assert.deepEqual(result, { kind: 'unauthorized' })
  assert.equal(queries.length, 0)
})

test('loadGoogleUsageSpikeRoutePayload returns not_found for reports outside the current company scope', async () => {
  const { client, queries } = createSupabaseStub({
    report: null,
  })

  const result = await loadGoogleUsageSpikeRoutePayload(client, 'report-1')

  assert.deepEqual(result, { kind: 'not_found' })
  assert.deepEqual(queries, [
    {
      table: 'companies',
      columns: 'id',
      filters: { supabase_user_id: 'user-1' },
    },
    {
      table: 'reports',
      columns: 'id, job_id',
      filters: { company_id: 'company-1', id: 'report-1' },
    },
  ])
})

test('getGoogleUsageSpikeReportPayload returns null when usage analyst output has no Google spike payload', async () => {
  const { client } = createSupabaseStub({
    usageOutput: { totalRequests: 42 },
  })

  const payload = await getGoogleUsageSpikeReportPayload(client, 'company-1', 'report-1')

  assert.equal(payload, null)
})

test('loadGoogleUsageSpikeRoutePayload returns the internal spike payload for owned reports', async () => {
  const googleUsageSpike: ExploratoryGoogleUsageSpike = buildGoogleUsageSpikeEnvelope(
    'collected',
    'Collected exploratory data.',
    {
      coverageStart: '2026-03-01',
      coverageEnd: '2026-03-30',
      latestCompleteDay: '2026-03-29',
      asOf: '2026-03-30T12:00:00.000Z',
      totalFeatureEvents: 7,
      distinctActiveUsers: 4,
      distinctLicensedActiveUsers: 3,
      dailyFeatureEvents: [{ date: '2026-03-01', eventCount: 7 }],
      actionBreakdown: [{ value: 'prompt_submit', eventCount: 7 }],
      appBreakdown: [{ value: 'gmail', eventCount: 7 }],
      eventCategoryBreakdown: [{ value: 'assist', eventCount: 7 }],
      featureSourceBreakdown: [{ value: 'side_panel', eventCount: 7 }],
      sampleEvents: [],
      normalizationLimits: [],
    }
  )
  const { client } = createSupabaseStub({
    usageOutput: {
      googleUsageSpike,
    },
  })

  const result = await loadGoogleUsageSpikeRoutePayload(client, 'report-1')

  assert.deepEqual(result, {
    kind: 'success',
    payload: {
      reportId: 'report-1',
      jobId: 'job-1',
      usageCapability: 'unsupported',
      googleUsageSpike,
    },
  })
})
