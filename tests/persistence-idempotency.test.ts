import test from 'node:test'
import assert from 'node:assert/strict'

import { upsertAgentOutput } from '../src/lib/agents/orchestrator'
import { upsertReportWithFallback } from '../src/lib/agents/synthesis'

test('upsertAgentOutput persists step output with an idempotent conflict target', async () => {
  let recordedPayload: unknown = null
  let recordedOptions: unknown = null

  const supabase = {
    from(tableName: string) {
      assert.equal(tableName, 'agent_outputs')

      return {
        async upsert(payload: unknown, options: unknown) {
          recordedPayload = payload
          recordedOptions = options
          return { error: null }
        },
      }
    },
  } as unknown as Parameters<typeof upsertAgentOutput>[0]

  await upsertAgentOutput(
    supabase,
    'job-1',
    'usage_analyst',
    { totalRequests: 42 }
  )

  assert.deepEqual(recordedPayload, {
    job_id: 'job-1',
    agent_name: 'usage_analyst',
    output: { totalRequests: 42 },
  })
  assert.deepEqual(recordedOptions, { onConflict: 'job_id,agent_name' })
})

test('upsertReportWithFallback retries with missing columns stripped and keeps job_id as the conflict key', async () => {
  const attempts: Array<{ payload: Record<string, unknown>; options: unknown }> = []

  const supabase = {
    from(tableName: string) {
      assert.equal(tableName, 'reports')

      return {
        upsert(payload: Record<string, unknown>, options: unknown) {
          attempts.push({ payload: { ...payload }, options })

          if (attempts.length === 1) {
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: null,
                      error: {
                        message: "Could not find the 'missing_column' column of 'reports'",
                      },
                    }
                  },
                }
              },
            }
          }

          return {
            select() {
              return {
                async single() {
                  return {
                    data: { id: 'report-1' },
                    error: null,
                  }
                },
              }
            },
          }
        },
      }
    },
  } as unknown as Parameters<typeof upsertReportWithFallback>[0]

  const report = await upsertReportWithFallback(supabase, {
    job_id: 'job-1',
    company_id: 'company-1',
    missing_column: 'strip-me',
  })

  assert.equal(report.id, 'report-1')
  assert.equal(attempts.length, 2)
  assert.deepEqual(attempts[0].options, { onConflict: 'job_id' })
  assert.deepEqual(attempts[1].options, { onConflict: 'job_id' })
  assert.equal('missing_column' in attempts[1].payload, false)
})
