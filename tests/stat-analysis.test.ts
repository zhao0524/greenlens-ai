import test from 'node:test'
import assert from 'node:assert/strict'

import { runStatAnalysis } from '../src/lib/analysis/run-stat-analysis'

test('runStatAnalysis uses the actual carbon total when computing percentile', async () => {
  const basePayload = {
    normalizedUsage: [
      {
        model: 'gpt-4o',
        totalInputTokens: 1000,
        totalOutputTokens: 500,
        totalRequests: 10,
      },
    ],
    dailyRequestCounts: [100, 110, 120, 130, 140],
    industry: 'technology',
  }

  const lowCarbon = await runStatAnalysis({
    ...basePayload,
    totalCarbonKg: 100,
  })
  const highCarbon = await runStatAnalysis({
    ...basePayload,
    totalCarbonKg: 1500,
  })

  assert.ok('carbon_percentile' in lowCarbon)
  assert.ok('carbon_percentile' in highCarbon)
  assert.equal(lowCarbon.usage_trend.trend_direction, 'increasing')
  assert.ok((highCarbon.carbon_percentile.percentile ?? 0) > (lowCarbon.carbon_percentile.percentile ?? 0))
})
