import axios from 'axios'

export async function getOpenAIUsage(apiKey: string, daysBack: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  // Usage API returns aggregate model metadata only.
  // Each record: date, model (snapshot_id), n_requests,
  // n_context_tokens_total, n_generated_tokens_total.
  // No prompt content, completion content, or user IDs.
  const response = await axios.get('https://api.openai.com/v1/usage', {
    headers: { Authorization: `Bearer ${apiKey}` },
    params: { date: formatDate(startDate) }
  })

  // Also capture daily counts for time series stat analysis
  const dailyRequestCounts: number[] = []
  for (const day of response.data.data || []) {
    const dayTotal = (day.data || []).reduce(
      (sum: number, item: any) => sum + (item.n_requests || 0), 0
    )
    dailyRequestCounts.push(dayTotal)
  }

  return {
    normalizedUsage: normalizeOpenAIUsage(response.data.data),
    dailyRequestCounts
  }
}

function normalizeOpenAIUsage(rawUsage: any[]) {
  const byModel: Record<string, any> = {}
  for (const day of rawUsage) {
    for (const item of day.data || []) {
      const model = item.snapshot_id || 'unknown'
      if (!byModel[model]) {
        byModel[model] = { model, provider: 'openai', totalInputTokens: 0, totalOutputTokens: 0, totalRequests: 0 }
      }
      byModel[model].totalInputTokens += item.n_context_tokens_total || 0
      byModel[model].totalOutputTokens += item.n_generated_tokens_total || 0
      byModel[model].totalRequests += item.n_requests || 0
    }
  }
  return Object.values(byModel)
}
