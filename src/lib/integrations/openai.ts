import axios from 'axios'
import { DEMO_SENTINEL_OPENAI, getFakeOpenAIUsage } from '@/lib/demo/fake-data'

const OPENAI_API_TIMEOUT_MS = 15000

// Flat item shape returned by the legacy /v1/usage endpoint (one date at a time)
interface OpenAIUsageItem {
  snapshot_id?: string
  n_requests?: number
  n_context_tokens_total?: number
  n_generated_tokens_total?: number
}

interface NormalizedOpenAIUsage {
  model: string
  provider: 'openai'
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export async function getOpenAIUsage(apiKey: string, daysBack: number = 30) {
  if (apiKey === DEMO_SENTINEL_OPENAI) return getFakeOpenAIUsage()

  // Build the last `daysBack` dates (skip today — the API returns incomplete data for the current day)
  const dates: string[] = []
  for (let i = 1; i <= daysBack; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(formatDate(d))
  }

  // Fire all 30 requests in parallel. Use allSettled so a single bad date doesn't abort everything.
  const results = await Promise.allSettled(
    dates.map(date =>
      axios.get('https://api.openai.com/v1/usage', {
        headers: { Authorization: `Bearer ${apiKey}` },
        params: { date },
        timeout: OPENAI_API_TIMEOUT_MS
      })
    )
  )

  const byModel: Record<string, NormalizedOpenAIUsage> = {}
  const dailyRequestCounts: number[] = []

  for (const result of results) {
    if (result.status === 'rejected') {
      dailyRequestCounts.push(0)
      continue
    }

    // The /v1/usage response is a flat list of usage items for that date
    const items: OpenAIUsageItem[] = result.value.data?.data ?? []

    const dayTotal = items.reduce((sum, item) => sum + (item.n_requests ?? 0), 0)
    dailyRequestCounts.push(dayTotal)

    for (const item of items) {
      const model = item.snapshot_id ?? 'unknown'
      if (!byModel[model]) {
        byModel[model] = { model, provider: 'openai', totalInputTokens: 0, totalOutputTokens: 0, totalRequests: 0 }
      }
      byModel[model].totalInputTokens += item.n_context_tokens_total ?? 0
      byModel[model].totalOutputTokens += item.n_generated_tokens_total ?? 0
      byModel[model].totalRequests += item.n_requests ?? 0
    }
  }

  return {
    normalizedUsage: Object.values(byModel),
    dailyRequestCounts
  }
}
