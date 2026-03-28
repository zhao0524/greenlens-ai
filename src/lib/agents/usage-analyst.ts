import { getOpenAIUsage } from '@/lib/integrations/openai'

export interface NormalizedUsage {
  model: string
  provider: string
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
  region?: string
  behaviorCluster: 'high_frequency_low_token' | 'low_frequency_high_token' | 'uniform'
}

interface IntegrationRecord {
  provider: string
  access_token: string
}

type RawUsageRecord = Omit<NormalizedUsage, 'behaviorCluster'>

export async function runUsageAnalyst(integrations: IntegrationRecord[]) {
  const allUsage: NormalizedUsage[] = []
  const allDailyCounts: number[] = []

  for (const integration of integrations) {
    try {
      if (integration.provider === 'openai') {
        const { normalizedUsage, dailyRequestCounts } = await getOpenAIUsage(integration.access_token)
        allUsage.push(...normalizedUsage.map((u: RawUsageRecord) => ({ ...u, behaviorCluster: classifyBehavior(u) })))
        allDailyCounts.push(...dailyRequestCounts)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Usage fetch failed for ${integration.provider}:`, message)
    }
  }

  const totalRequests = allUsage.reduce((s, u) => s + u.totalRequests, 0)
  const totalInputTokens = allUsage.reduce((s, u) => s + u.totalInputTokens, 0)
  const totalOutputTokens = allUsage.reduce((s, u) => s + u.totalOutputTokens, 0)

  const frontierModels = ['gpt-4', 'claude-3-opus', 'gemini-ultra']
  const frontierRequests = allUsage
    .filter(u => frontierModels.some(m => u.model.includes(m)))
    .reduce((s, u) => s + u.totalRequests, 0)

  const byProvider = allUsage.reduce((acc, u) => {
    acc[u.provider] = (acc[u.provider] || 0) + u.totalRequests
    return acc
  }, {} as Record<string, number>)

  return {
    normalizedUsage: allUsage,
    dailyRequestCounts: allDailyCounts,
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    modelCount: allUsage.length,
    frontierModelPercentage: totalRequests > 0
      ? Math.round((frontierRequests / totalRequests) * 100) : 0,
    dominantProvider: Object.entries(byProvider).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown'
  }
}

function classifyBehavior(usage: RawUsageRecord): NormalizedUsage['behaviorCluster'] {
  if (usage.totalRequests === 0) return 'uniform'
  const avgInput = usage.totalInputTokens / usage.totalRequests
  if (usage.totalRequests > 1000 && avgInput < 500) return 'high_frequency_low_token'
  if (avgInput > 2000 || (usage.totalOutputTokens / usage.totalRequests) > 1000) return 'low_frequency_high_token'
  return 'uniform'
}
