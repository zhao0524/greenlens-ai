import { DEMO_SENTINEL_OPENAI, getFakeOpenAIUsage } from '@/lib/demo/fake-data'

const OPENAI_API_TIMEOUT_MS = 15000

interface NormalizedOpenAIUsage {
  model: string
  provider: 'openai'
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
}

interface OpenAIUsageBucketResult {
  model?: string | null
  input_tokens?: number
  output_tokens?: number
  num_model_requests?: number
}

interface OpenAIUsageBucket {
  start_time?: number
  end_time?: number
  results?: OpenAIUsageBucketResult[]
}

interface OpenAIUsageResponse {
  data?: OpenAIUsageBucket[]
  has_more?: boolean
  next_page?: string | null
}

interface DailyRequestPoint {
  date: string
  requestCount: number
}

export interface OpenAIUsageAggregation {
  normalizedUsage: NormalizedOpenAIUsage[]
  dailyRequestCounts: number[]
  dailyRequestSeries: DailyRequestPoint[]
  coverageStart: string
  coverageEnd: string
  latestCompleteDay: string
  asOf: string
}

function formatUtcDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function getUtcStartOfToday() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function getUsageWindow(daysBack: number) {
  const utcStartOfToday = getUtcStartOfToday()
  const endTime = Math.floor(utcStartOfToday.getTime() / 1000)
  const startTime = endTime - daysBack * 24 * 60 * 60

  return {
    startTime,
    endTime,
    coverageStart: formatUtcDate(new Date(startTime * 1000)),
    coverageEnd: formatUtcDate(new Date((endTime - 24 * 60 * 60) * 1000)),
  }
}

function buildUsageUrl(startTime: number, endTime: number, limit: number, page: string | null) {
  const params = new URLSearchParams({
    start_time: String(startTime),
    end_time: String(endTime),
    bucket_width: '1d',
    limit: String(limit),
  })
  params.append('group_by', 'model')
  if (page) params.append('page', page)
  return `https://api.openai.com/v1/organization/usage/completions?${params.toString()}`
}

async function fetchUsagePage(apiKey: string, url: string) {
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(OPENAI_API_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`OpenAI Usage API timed out after ${OPENAI_API_TIMEOUT_MS / 1000}s`)
    }
    throw error
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `OpenAI Usage API rejected this key (${response.status}). Use an organization admin key with access to /v1/organization/usage and reconnect the OpenAI integration.`
      )
    }
    throw new Error(`OpenAI Usage API returned ${response.status}: ${errorText}`)
  }

  return response.json() as Promise<OpenAIUsageResponse>
}

export function aggregateOpenAIUsageBuckets(
  buckets: OpenAIUsageBucket[],
  coverageStart: string,
  coverageEnd: string,
  asOf: string
): OpenAIUsageAggregation {
  const byModel: Record<string, NormalizedOpenAIUsage> = {}
  const sortedBuckets = [...buckets].sort(
    (left, right) => (left.start_time ?? 0) - (right.start_time ?? 0)
  )
  const dailyRequestMap = new Map<string, number>()

  const cursor = new Date(`${coverageStart}T00:00:00.000Z`)
  const endCursor = new Date(`${coverageEnd}T00:00:00.000Z`)
  while (cursor <= endCursor) {
    dailyRequestMap.set(formatUtcDate(cursor), 0)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  for (const bucket of sortedBuckets) {
    const bucketDate = formatUtcDate(new Date((bucket.start_time ?? 0) * 1000))
    const bucketResults = bucket.results ?? []
    const requestCount = bucketResults.reduce(
      (sum, result) => sum + (result.num_model_requests ?? 0),
      0
    )

    for (const result of bucketResults) {
      const model = result.model ?? 'unknown'
      if (!byModel[model]) {
        byModel[model] = {
          model,
          provider: 'openai',
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalRequests: 0,
        }
      }

      byModel[model].totalInputTokens += result.input_tokens ?? 0
      byModel[model].totalOutputTokens += result.output_tokens ?? 0
      byModel[model].totalRequests += result.num_model_requests ?? 0
    }

    dailyRequestMap.set(bucketDate, requestCount)
  }

  const dailyRequestSeries = [...dailyRequestMap.entries()].map(([date, requestCount]) => ({
    date,
    requestCount,
  }))

  return {
    normalizedUsage: Object.values(byModel),
    dailyRequestCounts: dailyRequestSeries.map((point) => point.requestCount),
    dailyRequestSeries,
    coverageStart,
    coverageEnd,
    latestCompleteDay: coverageEnd,
    asOf,
  }
}

export async function getOpenAIUsage(
  apiKey: string,
  daysBack: number = 30,
  demoRunIndex: number = 1
) {
  if (apiKey === DEMO_SENTINEL_OPENAI) return getFakeOpenAIUsage(demoRunIndex)

  const { startTime, endTime, coverageStart, coverageEnd } = getUsageWindow(daysBack)
  const asOf = new Date().toISOString()
  const buckets: OpenAIUsageBucket[] = []
  const limit = Math.min(daysBack, 31)

  let page: string | null = null
  let pageCount = 0

  do {
    pageCount += 1
    if (pageCount > 5) {
      throw new Error('OpenAI Usage API pagination exceeded 5 pages for a 30-day request.')
    }

    const response = await fetchUsagePage(apiKey, buildUsageUrl(startTime, endTime, limit, page))
    buckets.push(...(response.data ?? []))
    page = response.next_page ?? null
  } while (page)

  return aggregateOpenAIUsageBuckets(buckets, coverageStart, coverageEnd, asOf)
}
