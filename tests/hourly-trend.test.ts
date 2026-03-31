import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildWorkingHoursTrendData,
  normalizeTrendDirection,
} from '../src/lib/analysis/hourly-trend'

test('buildWorkingHoursTrendData keeps the shared hourly label set stable', () => {
  const labels = buildWorkingHoursTrendData({
    projected30dRequests: 24000,
    trendDirection: 'stable',
    anomalyDetected: false,
  }).map((point) => point.label)

  assert.deepEqual(labels, ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'])
})

test('buildWorkingHoursTrendData peaks during working hours instead of overnight', () => {
  const trend = buildWorkingHoursTrendData({
    projected30dRequests: 36000,
    trendDirection: 'increasing',
    anomalyDetected: false,
  })
  const peakPoint = trend.reduce((peak, point) => point.actual > peak.actual ? point : peak, trend[0])
  const overnightPoints = trend.filter((point) => ['00:00', '02:00', '04:00'].includes(point.label))

  assert.ok(['10:00', '12:00', '14:00', '16:00'].includes(peakPoint.label))
  assert.ok(overnightPoints.every((point) => point.actual < peakPoint.actual))
})

test('normalizeTrendDirection accepts both old and new direction vocabularies', () => {
  assert.equal(normalizeTrendDirection('upward'), 'increasing')
  assert.equal(normalizeTrendDirection('decreasing'), 'decreasing')
  assert.equal(normalizeTrendDirection('stable'), 'stable')
  assert.equal(normalizeTrendDirection(undefined), 'stable')
})
