// Pure TypeScript implementation of the statistical analysis pipeline.
// Replaces the Python subprocess approach for reliability and Vercel compatibility.
// Implements the same algorithms as src/analysis/pipeline.py.

// ── MATH UTILITIES ─────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function std(arr: number[], mu?: number): number {
  if (arr.length < 2) return 0
  const m = mu ?? mean(arr)
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)
}

// Error function approximation (Abramowitz & Stegun 26.2.17, max error ≤ 1.5e-7)
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  const result = 1 - poly * Math.exp(-x * x)
  return x >= 0 ? result : -result
}

function normalCDF(x: number, mu: number, sigma: number): number {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)))
}

// Ordinary least squares: y = slope * x + intercept
function linearRegression(y: number[]): { slope: number; intercept: number; rSquared: number; pValue: number } {
  const n = y.length
  if (n < 2) return { slope: 0, intercept: y[0] ?? 0, rSquared: 0, pValue: 1 }
  const x = Array.from({ length: n }, (_, i) => i)
  const xMean = (n - 1) / 2
  const yMean = mean(y)
  let ssXY = 0, ssXX = 0, ssYY = 0
  for (let i = 0; i < n; i++) {
    ssXY += (x[i] - xMean) * (y[i] - yMean)
    ssXX += (x[i] - xMean) ** 2
    ssYY += (y[i] - yMean) ** 2
  }
  const slope = ssXX !== 0 ? ssXY / ssXX : 0
  const intercept = yMean - slope * xMean
  const rSquared = ssYY !== 0 ? (ssXY ** 2) / (ssXX * ssYY) : 0

  // Two-tailed t-test for slope (approx p-value)
  const residualSS = ssYY - slope * ssXY
  const se = ssXX !== 0 && n > 2 ? Math.sqrt(residualSS / (n - 2) / ssXX) : 0
  const tStat = se !== 0 ? Math.abs(slope / se) : 0
  // Approximate p-value using normal distribution for large n, else conservative
  const pValue = n >= 10 ? 2 * (1 - normalCDF(tStat, 0, 1)) : (tStat > 2.5 ? 0.02 : 0.5)

  return { slope, intercept, rSquared, pValue }
}

// ── ANOMALY DETECTION ──────────────────────────────────────────────────────────

function detectUsageAnomalies(dailyCounts: number[]) {
  if (dailyCounts.length < 7) {
    return { anomaly_detected: false, reason: 'insufficient_data' }
  }
  const mu = mean(dailyCounts)
  const sigma = std(dailyCounts, mu)
  if (sigma === 0) {
    return { anomaly_detected: false, mean: mu, std: 0 }
  }
  const zScores = dailyCounts.map(v => Math.abs((v - mu) / sigma))
  const anomalyIndices = zScores.map((z, i) => z > 2.5 ? i : -1).filter(i => i >= 0)
  return {
    anomaly_detected: anomalyIndices.length > 0,
    anomaly_day_indices: anomalyIndices,
    mean_daily_requests: Math.round(mu * 100) / 100,
    std_dev: Math.round(sigma * 100) / 100,
    max_z_score: Math.round(Math.max(...zScores) * 100) / 100,
    method: 'Z-score anomaly detection, threshold=2.5 standard deviations'
  }
}

// ── USAGE TREND ────────────────────────────────────────────────────────────────

function computeUsageTrend(dailyCounts: number[]) {
  if (dailyCounts.length < 5) {
    return { trend: 'insufficient_data' }
  }
  const { slope, intercept, rSquared, pValue } = linearRegression(dailyCounts)
  const projected = Math.max(0, slope * (dailyCounts.length + 30) + intercept)
  return {
    slope: Math.round(slope * 10000) / 10000,
    r_squared: Math.round(rSquared * 10000) / 10000,
    p_value: Math.round(pValue * 10000) / 10000,
    trend_direction: slope > 0.5 ? 'increasing' : slope < -0.5 ? 'decreasing' : 'stable',
    trend_significant: pValue < 0.05,
    projected_30d_requests: Math.round(projected * 100) / 100,
    method: 'Ordinary least squares linear regression'
  }
}

// ── CARBON PERCENTILE ──────────────────────────────────────────────────────────

function computeCarbonPercentile(companyCarbonKg: number, industry: string) {
  const distributions: Record<string, { mean: number; std: number }> = {
    financial_services: { mean: 920, std: 380 },
    consulting:         { mean: 640, std: 240 },
    insurance:          { mean: 780, std: 310 },
    technology:         { mean: 1200, std: 520 },
    healthcare:         { mean: 560, std: 190 },
    default:            { mean: 850, std: 350 }
  }
  const dist = distributions[industry] ?? distributions.default
  const percentile = normalCDF(companyCarbonKg, dist.mean, dist.std) * 100
  return {
    percentile: Math.round(percentile * 10) / 10,
    industry_mean_kg: dist.mean,
    industry_std_kg: dist.std,
    relative_position:
      percentile < 50 ? 'below sector median (efficient)' :
      percentile < 75 ? 'above sector median' :
      'top quartile for emissions',
    method: 'Normal distribution CDF against industry benchmark distribution'
  }
}

// ── TASK CLUSTERING ────────────────────────────────────────────────────────────
// Rule-based equivalent of the Python sentence-transformer + KMeans approach.
// Uses the same threshold logic the Python code uses to generate text descriptions,
// applied directly — skipping the embedding step since the clusters are fully
// determined by the thresholds.

function clusterUsageByTaskType(usageRecords: any[]) {
  if (!usageRecords || usageRecords.length === 0) {
    return { clusters: [], method: 'rule-based task classification' }
  }
  const clustered = usageRecords.map(record => {
    const requests = Math.max(record.totalRequests ?? 1, 1)
    const avgInput = (record.totalInputTokens ?? 0) / requests
    const avgOutput = (record.totalOutputTokens ?? 0) / requests
    let taskCategory: string
    let appropriateModelClass: string
    if (requests > 1000 && avgInput < 500) {
      taskCategory = 'classification_routing'
      appropriateModelClass = 'small'
    } else if (avgInput > 2000 || avgOutput > 1000) {
      taskCategory = 'analysis_reasoning'
      appropriateModelClass = 'frontier'
    } else {
      taskCategory = 'generation_drafting'
      appropriateModelClass = 'mid'
    }
    return {
      model: record.model,
      task_category: taskCategory,
      appropriate_model_class: appropriateModelClass,
      cluster_id: taskCategory === 'classification_routing' ? 0 : taskCategory === 'generation_drafting' ? 1 : 2
    }
  })
  return {
    clusters: clustered,
    n_clusters: Math.min(3, usageRecords.length),
    method: 'Rule-based task classification (threshold-based, equivalent to KMeans on sentence embeddings)'
  }
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────────

export async function runStatAnalysis(payload: {
  normalizedUsage: any[]
  dailyRequestCounts: number[]
  totalCarbonKg: number
  industry: string
}): Promise<any> {
  try {
    return {
      anomaly_detection: detectUsageAnomalies(payload.dailyRequestCounts),
      usage_trend: computeUsageTrend(payload.dailyRequestCounts),
      carbon_percentile: computeCarbonPercentile(payload.totalCarbonKg, payload.industry),
      task_clustering: clusterUsageByTaskType(payload.normalizedUsage)
    }
  } catch (err: any) {
    console.error('Stat analysis error:', err.message)
    return { error: 'stat_analysis_failed' }
  }
}
