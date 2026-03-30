import { getOpenAIUsage } from '@/lib/integrations/openai'
import { isFrontierModel } from '@/lib/analysis/model-classification'
import {
  buildAvailableSection,
  buildProviderStatus,
  buildUnavailableSection,
  buildUnsupportedProviderStatus,
  supportsProviderCapability,
  type SectionAvailability,
  type ProviderAnalysisStatus,
} from '@/lib/analysis/provider-status'
import { ensureFreshIntegration } from '@/lib/integrations/tokens'
import type { IntegrationRecord } from '@/lib/integrations/types'
import {
  buildGoogleUsageSpikeEnvelope,
  buildGoogleUsageSpikeWindow,
  getExploratoryGoogleUsageSpike,
  type ExploratoryGoogleUsageSpike,
} from '@/lib/integrations/google'

export interface NormalizedUsage {
  model: string
  provider: string
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
  region?: string
  behaviorCluster: 'high_frequency_low_token' | 'low_frequency_high_token' | 'uniform'
}

export interface UsageAnalysisResult {
  normalizedUsage: NormalizedUsage[]
  dailyRequestCounts: number[]
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  modelCount: number
  frontierModelPercentage: number
  dominantProvider: string
  coverageStart: string | null
  coverageEnd: string | null
  latestCompleteDay: string | null
  asOf: string | null
  providerStatus: ProviderAnalysisStatus[]
  availability: SectionAvailability
  googleUsageSpike?: ExploratoryGoogleUsageSpike | null
}

type RawUsageRecord = Omit<NormalizedUsage, 'behaviorCluster'>
type GoogleUsageSpikeCollector = typeof getExploratoryGoogleUsageSpike

interface UsageAnalystOptions {
  demoRunIndex?: number
  googleUsageSpikeEnabled?: boolean
  googleUsageSpikeCollector?: GoogleUsageSpikeCollector
}

const GOOGLE_USAGE_SPIKE_DAYS_BACK = 30

function minDate(left: string | null, right: string | null) {
  if (!left) return right
  if (!right) return left
  return left < right ? left : right
}

function maxDate(left: string | null, right: string | null) {
  if (!left) return right
  if (!right) return left
  return left > right ? left : right
}

function buildUnsupportedUsageMessage(provider: string) {
  if (provider === 'microsoft') {
    return 'Microsoft 365 is connected for license analysis, but automated usage analysis is not implemented in this build.'
  }

  if (provider === 'google') {
    return 'Google Workspace is connected, but automated usage analysis is not implemented in this build.'
  }

  return `${provider} is connected, but automated usage analysis is not implemented in this build.`
}

function buildUsageUnavailableMessage(integrations: IntegrationRecord[]) {
  if (integrations.length === 0) {
    return 'Connect OpenAI to unlock usage, carbon, benchmark, and ESG reporting.'
  }

  const connectedProviders = integrations.map((integration) => integration.provider)
  const providerList = connectedProviders.join(', ')

  return `Connected providers (${providerList}) do not currently expose supported usage analysis in this build. Connect OpenAI to unlock usage, carbon, benchmark, and ESG reporting.`
}

function isGoogleUsageSpikeEnabled(override?: boolean) {
  if (typeof override === 'boolean') {
    return override
  }

  return process.env.ENABLE_GOOGLE_USAGE_SPIKE === 'true'
}

async function maybeCollectGoogleUsageSpike(
  integrations: IntegrationRecord[],
  {
    enabled,
    collector,
  }: {
    enabled?: boolean
    collector?: GoogleUsageSpikeCollector
  }
) {
  const googleIntegration = integrations.find((integration) => integration.provider === 'google')
  if (!googleIntegration) {
    return null
  }

  const coverageWindow = buildGoogleUsageSpikeWindow(GOOGLE_USAGE_SPIKE_DAYS_BACK)

  if (!isGoogleUsageSpikeEnabled(enabled)) {
    return buildGoogleUsageSpikeEnvelope(
      'disabled',
      'Exploratory Google usage collection is disabled. Set ENABLE_GOOGLE_USAGE_SPIKE=true to collect internal Gemini activity analytics.',
      coverageWindow
    )
  }

  try {
    const freshIntegration = await ensureFreshIntegration(googleIntegration)
    const activeCollector = collector ?? getExploratoryGoogleUsageSpike
    return await activeCollector(
      freshIntegration.access_token,
      GOOGLE_USAGE_SPIKE_DAYS_BACK
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Google usage spike failure'

    return buildGoogleUsageSpikeEnvelope(
      'failed',
      `Exploratory Google usage collection failed: ${message}`,
      coverageWindow
    )
  }
}

export async function runUsageAnalyst(
  integrations: IntegrationRecord[],
  {
    demoRunIndex = 1,
    googleUsageSpikeEnabled,
    googleUsageSpikeCollector,
  }: UsageAnalystOptions = {}
): Promise<UsageAnalysisResult> {
  const allUsage: NormalizedUsage[] = []
  const providerStatus: ProviderAnalysisStatus[] = []
  const dailyRequestMap = new Map<string, number>()
  let coverageStart: string | null = null
  let coverageEnd: string | null = null
  let latestCompleteDay: string | null = null
  let asOf: string | null = null
  const googleUsageSpikePromise = maybeCollectGoogleUsageSpike(integrations, {
    enabled: googleUsageSpikeEnabled,
    collector: googleUsageSpikeCollector,
  })
  const usageIntegrations = integrations.filter((record) =>
    supportsProviderCapability(record.provider, 'usage')
  )

  for (const integration of integrations) {
    if (!supportsProviderCapability(integration.provider, 'usage')) {
      providerStatus.push(
        buildUnsupportedProviderStatus(
          integration.provider,
          'usage',
          buildUnsupportedUsageMessage(integration.provider)
        )
      )
    }
  }

  for (const integration of usageIntegrations) {
    try {
      const freshIntegration = await ensureFreshIntegration(integration)
      const usage = await getOpenAIUsage(freshIntegration.access_token, 30, demoRunIndex)

      allUsage.push(
        ...usage.normalizedUsage.map((record: RawUsageRecord) => ({
          ...record,
          behaviorCluster: classifyBehavior(record),
        }))
      )

      for (const point of usage.dailyRequestSeries) {
        dailyRequestMap.set(point.date, (dailyRequestMap.get(point.date) ?? 0) + point.requestCount)
      }

      coverageStart = minDate(coverageStart, usage.coverageStart)
      coverageEnd = maxDate(coverageEnd, usage.coverageEnd)
      latestCompleteDay = maxDate(latestCompleteDay, usage.latestCompleteDay)
      asOf = maxDate(asOf, usage.asOf)

      providerStatus.push(
        buildProviderStatus({
          provider: integration.provider,
          capability: 'usage',
          status: 'fresh',
          message: `OpenAI usage data loaded through ${usage.latestCompleteDay}.`,
          coverageStart: usage.coverageStart,
          coverageEnd: usage.coverageEnd,
          latestCompleteDay: usage.latestCompleteDay,
          asOf: usage.asOf,
        })
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown OpenAI usage failure'
      throw new Error(`OpenAI usage collection failed: ${message}`)
    }
  }

  const googleUsageSpike = await googleUsageSpikePromise

  if (usageIntegrations.length === 0) {
    return {
      normalizedUsage: allUsage,
      dailyRequestCounts: [],
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      modelCount: 0,
      frontierModelPercentage: 0,
      dominantProvider: 'unknown',
      coverageStart,
      coverageEnd,
      latestCompleteDay,
      asOf,
      providerStatus,
      availability: buildUnavailableSection(buildUsageUnavailableMessage(integrations)),
      googleUsageSpike,
    }
  }

  const dailyRequestCounts = [...dailyRequestMap.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([, requestCount]) => requestCount)

  const totalRequests = allUsage.reduce((s, u) => s + u.totalRequests, 0)
  const totalInputTokens = allUsage.reduce((s, u) => s + u.totalInputTokens, 0)
  const totalOutputTokens = allUsage.reduce((s, u) => s + u.totalOutputTokens, 0)
  const frontierRequests = allUsage
    .filter((usage) => isFrontierModel(usage.model))
    .reduce((s, u) => s + u.totalRequests, 0)

  const byProvider = allUsage.reduce((acc, u) => {
    acc[u.provider] = (acc[u.provider] || 0) + u.totalRequests
    return acc
  }, {} as Record<string, number>)

  return {
    normalizedUsage: allUsage,
    dailyRequestCounts,
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    modelCount: allUsage.length,
    frontierModelPercentage: totalRequests > 0
      ? Math.round((frontierRequests / totalRequests) * 100) : 0,
    dominantProvider: Object.entries(byProvider).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown',
    coverageStart,
    coverageEnd,
    latestCompleteDay,
    asOf,
    providerStatus,
    availability: buildAvailableSection(
      totalRequests > 0
        ? 'Supported usage data loaded successfully.'
        : 'Supported usage data loaded successfully with no requests recorded in the coverage window.'
    ),
    googleUsageSpike,
  }
}

function classifyBehavior(usage: RawUsageRecord): NormalizedUsage['behaviorCluster'] {
  if (usage.totalRequests === 0) return 'uniform'
  const avgInput = usage.totalInputTokens / usage.totalRequests
  if (usage.totalRequests > 1000 && avgInput < 500) return 'high_frequency_low_token'
  if (avgInput > 2000 || (usage.totalOutputTokens / usage.totalRequests) > 1000) return 'low_frequency_high_token'
  return 'uniform'
}
