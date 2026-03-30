import test from 'node:test'
import assert from 'node:assert/strict'

import { runUsageAnalyst } from '../src/lib/agents/usage-analyst'
import { DEMO_SENTINEL_GOOGLE, DEMO_SENTINEL_OPENAI } from '../src/lib/demo/fake-data'
import {
  buildGoogleUsageSpikeEnvelope,
  type ExploratoryGoogleUsageSpike,
} from '../src/lib/integrations/google'
import type { IntegrationRecord } from '../src/lib/integrations/types'

function buildIntegration(provider: string, accessToken: string): IntegrationRecord {
  return {
    id: `${provider}-integration`,
    provider,
    access_token: accessToken,
    refresh_token: null,
    token_expires_at: null,
    is_active: true,
    metadata: null,
  }
}

test('runUsageAnalyst marks Google usage spike as disabled by default', async () => {
  const result = await runUsageAnalyst([
    buildIntegration('google', DEMO_SENTINEL_GOOGLE),
  ])

  assert.equal(result.availability.status, 'unavailable')
  assert.equal(result.googleUsageSpike?.status, 'disabled')
  assert.match(
    result.googleUsageSpike?.message ?? '',
    /ENABLE_GOOGLE_USAGE_SPIKE=true/
  )
})

test('runUsageAnalyst persists a collected Google usage spike without changing shipped usage capability', async () => {
  const collectedSpike: ExploratoryGoogleUsageSpike = buildGoogleUsageSpikeEnvelope(
    'collected',
    'Collected exploratory data.',
    {
      coverageStart: '2026-03-01',
      coverageEnd: '2026-03-30',
      latestCompleteDay: '2026-03-29',
      asOf: '2026-03-30T12:00:00.000Z',
      totalFeatureEvents: 8,
      distinctActiveUsers: 5,
      distinctLicensedActiveUsers: 4,
      dailyFeatureEvents: [{ date: '2026-03-01', eventCount: 8 }],
      actionBreakdown: [{ value: 'prompt_submit', eventCount: 8 }],
      appBreakdown: [{ value: 'gmail', eventCount: 8 }],
      eventCategoryBreakdown: [{ value: 'assist', eventCount: 8 }],
      featureSourceBreakdown: [{ value: 'side_panel', eventCount: 8 }],
      sampleEvents: [],
      normalizationLimits: [],
    }
  )
  const collectorCalls: Array<{ accessToken: string; daysBack: number }> = []

  const result = await runUsageAnalyst(
    [
      buildIntegration('openai', DEMO_SENTINEL_OPENAI),
      buildIntegration('google', DEMO_SENTINEL_GOOGLE),
    ],
    {
      googleUsageSpikeEnabled: true,
      googleUsageSpikeCollector: async (accessToken, daysBack) => {
        collectorCalls.push({ accessToken, daysBack })
        return collectedSpike
      },
    }
  )

  assert.equal(result.availability.status, 'available')
  assert.deepEqual(result.googleUsageSpike, collectedSpike)
  assert.deepEqual(collectorCalls, [
    { accessToken: DEMO_SENTINEL_GOOGLE, daysBack: 30 },
  ])
  assert.equal(
    result.providerStatus.find((status) => status.provider === 'google')?.status,
    'unsupported'
  )
})

test('runUsageAnalyst keeps the job alive when exploratory Google usage collection fails', async () => {
  const result = await runUsageAnalyst(
    [buildIntegration('google', DEMO_SENTINEL_GOOGLE)],
    {
      googleUsageSpikeEnabled: true,
      googleUsageSpikeCollector: async () => {
        throw new Error('boom')
      },
    }
  )

  assert.equal(result.availability.status, 'unavailable')
  assert.equal(result.googleUsageSpike?.status, 'failed')
  assert.match(result.googleUsageSpike?.message ?? '', /boom/)
  assert.equal(
    result.providerStatus.find((status) => status.provider === 'google')?.status,
    'unsupported'
  )
})
