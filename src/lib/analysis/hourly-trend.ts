export interface WorkingHoursTrendPoint {
  label: string
  actual: number
  target: number
}

export function normalizeTrendDirection(direction: string | null | undefined) {
  const normalized = (direction ?? '').trim().toLowerCase()
  if (normalized === 'upward' || normalized === 'increasing') return 'increasing'
  if (normalized === 'downward' || normalized === 'decreasing') return 'decreasing'
  return 'stable'
}

const HOURLY_LABELS = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
const WORKING_HOUR_PROFILE = [0.24, 0.19, 0.15, 0.22, 0.7, 0.98, 1.08, 1.04, 0.9, 0.62, 0.38, 0.28]

export function buildWorkingHoursTrendData({
  projected30dRequests,
  trendDirection,
  anomalyDetected,
  slope,
}: {
  projected30dRequests?: number | null
  trendDirection?: string | null
  anomalyDetected?: boolean
  slope?: number | null
}) {
  const normalizedTrendDirection = normalizeTrendDirection(trendDirection)
  const base = projected30dRequests != null
    ? Math.max(180, projected30dRequests / 30)
    : 720
  const directionalBias = normalizedTrendDirection === 'increasing'
    ? 0.09
    : normalizedTrendDirection === 'decreasing'
      ? -0.09
      : 0
  const slopeBias = slope != null
    ? Math.max(-0.08, Math.min(0.08, slope / 20))
    : 0

  return HOURLY_LABELS.map((label, index) => {
    const profile = WORKING_HOUR_PROFILE[index]
    const relativePosition = (index - (HOURLY_LABELS.length - 1) / 2) / ((HOURLY_LABELS.length - 1) / 2)
    const directionalFactor = 1 + relativePosition * (directionalBias + slopeBias)
    const anomalyFactor = anomalyDetected && index === 8 ? 1.16 : 1
    const actual = Math.max(80, Math.round(base * profile * directionalFactor * anomalyFactor))
    const target = Math.round(Math.max(base * 1.08, actual * 1.12))

    return {
      label,
      actual,
      target,
    } satisfies WorkingHoursTrendPoint
  })
}

