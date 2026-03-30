import test from 'node:test'
import assert from 'node:assert/strict'

import { aggregateOpenAIUsageBuckets } from '../src/lib/integrations/openai'
import { getFakeOpenAIUsage } from '../src/lib/demo/fake-data'

test('aggregateOpenAIUsageBuckets groups by model, fills missing days, and preserves chronological order', () => {
  const result = aggregateOpenAIUsageBuckets(
    [
      {
        start_time: Date.parse('2026-03-03T00:00:00.000Z') / 1000,
        results: [
          { model: 'gpt-4o-2024-08-06', input_tokens: 90, output_tokens: 45, num_model_requests: 9 },
        ],
      },
      {
        start_time: Date.parse('2026-03-01T00:00:00.000Z') / 1000,
        results: [
          { model: 'gpt-4o-2024-08-06', input_tokens: 50, output_tokens: 20, num_model_requests: 5 },
          { model: 'gpt-4o-mini', input_tokens: 10, output_tokens: 5, num_model_requests: 1 },
        ],
      },
    ],
    '2026-03-01',
    '2026-03-03',
    '2026-03-04T12:00:00.000Z'
  )

  assert.deepEqual(result.dailyRequestCounts, [6, 0, 9])
  assert.deepEqual(
    result.dailyRequestSeries.map((point) => point.date),
    ['2026-03-01', '2026-03-02', '2026-03-03']
  )
  assert.equal(result.normalizedUsage.find((usage) => usage.model === 'gpt-4o-2024-08-06')?.totalRequests, 14)
  assert.equal(result.coverageEnd, '2026-03-03')
  assert.equal(result.latestCompleteDay, '2026-03-03')
})

test('getFakeOpenAIUsage advances the NovaTech demo dataset on later analysis runs', () => {
  const firstRun = getFakeOpenAIUsage(1)
  const laterRun = getFakeOpenAIUsage(4)

  const firstRun4o = firstRun.normalizedUsage.find((usage) => usage.model === 'gpt-4o-2024-08-06')
  const laterRun4o = laterRun.normalizedUsage.find((usage) => usage.model === 'gpt-4o-2024-08-06')

  assert.ok(firstRun4o)
  assert.ok(laterRun4o)
  assert.ok(laterRun4o.totalRequests > firstRun4o.totalRequests)
  assert.ok(laterRun.dailyRequestCounts.at(-1)! > firstRun.dailyRequestCounts.at(-1)!)
})
