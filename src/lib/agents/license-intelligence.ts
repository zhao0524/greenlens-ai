import { getGoogleLicenseActivitySummary } from '@/lib/integrations/google'
import {
  getMicrosoftCopilotUsage,
  getMicrosoftLicenseDetails,
} from '@/lib/integrations/microsoft'
import { getOpenAIUsage } from '@/lib/integrations/openai'
import {
  buildAvailableSection,
  buildProviderStatus,
  buildUnavailableSection,
  buildUnsupportedProviderStatus,
  supportsProviderCapability,
  type ProviderAnalysisStatus,
  type SectionAvailability,
} from '@/lib/analysis/provider-status'
import {
  buildModeledProviderSpend,
  getUsageBillingProviderLabel,
  type ModeledProviderSpend,
  type UsageSpendRecord,
} from '@/lib/billing/modeled-spend'
import { ensureFreshIntegration } from '@/lib/integrations/tokens'
import type { IntegrationRecord } from '@/lib/integrations/types'

export type BillingBasis = 'seat' | 'usage'
export type PricingCoverage = 'modeled' | 'partial' | 'unmodeled'

interface LicenseProviderSummary {
  provider: string
  billingBasis: BillingBasis
  unitLabel: 'seats' | 'requests'
  totalUnits: number | null
  activeUnits: number | null
  dormantUnits: number | null
  utilizationRate: number | null
  estimatedAnnualCost: number | null
  optimizationOpportunity: number | null
  recommendation: string
  pricingCoverage: PricingCoverage
  coverageRate: number | null
  totalInputTokens: number | null
  totalOutputTokens: number | null
  totalRequests: number | null
  modelCount: number | null
  modeledModelCount: number | null
  totalSeats: number | null
  activeSeats: number | null
  dormantSeats: number | null
  potentialSavingsAtRenewal: number | null
}

interface RenewalAlert {
  provider: string
  monthsToRenewal: number
  renewalDate: string
  actionRequired: string
}

interface MicrosoftCopilotUsageUser {
  hasCopilotActivity?: boolean
  copilotLastActivityDate?: string | null
  reportRefreshDate?: string
}

interface MicrosoftCopilotUsageResponse {
  value?: MicrosoftCopilotUsageUser[]
}

interface ProviderLicenseAnalysis {
  providerSummary: LicenseProviderSummary
  providerStatus: ProviderAnalysisStatus
  renewalAlert: RenewalAlert | null
}

export interface LicenseIntelligenceResult {
  providers: LicenseProviderSummary[]
  totalLicensedSeats: number
  totalActiveSeats: number
  totalDormantSeats: number
  overallUtilizationRate: number | null
  estimatedAnnualLicenseCost: number | null
  potentialAnnualSavings: number | null
  estimatedAnnualSpend: number | null
  potentialAnnualOptimization: number | null
  pricingCoverage: 'full' | 'partial' | 'none'
  pricedProviderCount: number
  optimizationProviderCount: number
  renewalAlerts: RenewalAlert[]
  providerStatus: ProviderAnalysisStatus[]
  availability: SectionAvailability
}

function buildUnsupportedLicenseMessage(provider: string) {
  if (provider === 'anthropic') {
    return 'Anthropic pricing support exists in the billing library, but a live Anthropic integration is not implemented in this build.'
  }

  return `${provider} is connected, but automated billing or license analysis is not implemented in this build.`
}

function buildLicenseUnavailableMessage(integrations: IntegrationRecord[]) {
  if (integrations.length === 0) {
    return 'Connect OpenAI, Microsoft 365, or Google Workspace to unlock billing and license reporting.'
  }

  const connectedProviders = integrations.map((integration) => integration.provider)
  const providerList = connectedProviders.join(', ')

  return `Connected providers (${providerList}) do not currently expose supported billing or license analysis in this build. Connect OpenAI, Microsoft 365, or Google Workspace to unlock this section.`
}

function buildRenewalAlert(providerLabel: string, integration: IntegrationRecord) {
  const renewalDate = integration.metadata?.renewal_date
  if (!renewalDate) return null

  const monthsToRenewal = Math.round(
    (new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
  )

  if (monthsToRenewal > 6) {
    return null
  }

  return {
    provider: providerLabel,
    monthsToRenewal,
    renewalDate,
    actionRequired: `Right-sizing decision needed ${monthsToRenewal} months before renewal`,
  } satisfies RenewalAlert
}

async function analyzeMicrosoftLicenseIntegration(
  integration: IntegrationRecord
): Promise<ProviderLicenseAnalysis> {
  const freshIntegration = await ensureFreshIntegration(integration)
  const licenseData = await getMicrosoftLicenseDetails(freshIntegration.access_token)
  const copilotUsage = await getMicrosoftCopilotUsage(
    freshIntegration.access_token
  ) as MicrosoftCopilotUsageResponse

  const activeSeats = copilotUsage.value
    ? copilotUsage.value.filter(
        (user) => user.hasCopilotActivity || Boolean(user.copilotLastActivityDate)
      ).length
    : 0

  const dormantSeats = Math.max(licenseData.totalSeats - activeSeats, 0)
  const utilizationRate = licenseData.totalSeats > 0
    ? Math.round((activeSeats / licenseData.totalSeats) * 100)
    : 0

  const providerSummary = {
    provider: 'Microsoft Copilot',
    billingBasis: 'seat',
    unitLabel: 'seats',
    totalUnits: licenseData.totalSeats,
    activeUnits: activeSeats,
    dormantUnits: dormantSeats,
    utilizationRate,
    estimatedAnnualCost: licenseData.estimatedAnnualCost,
    optimizationOpportunity: dormantSeats * 30 * 12,
    recommendation: dormantSeats > 20
      ? `Right-size from ${licenseData.totalSeats} to ${activeSeats + 10} seats at renewal. Estimated saving: $${((dormantSeats - 10) * 30 * 12).toLocaleString()}/year.`
      : `Utilization healthy at ${utilizationRate}%. Monitor at next renewal.`,
    pricingCoverage: 'modeled',
    coverageRate: 100,
    totalInputTokens: null,
    totalOutputTokens: null,
    totalRequests: null,
    modelCount: null,
    modeledModelCount: null,
    totalSeats: licenseData.totalSeats,
    activeSeats,
    dormantSeats,
    potentialSavingsAtRenewal: dormantSeats * 30 * 12,
  } satisfies LicenseProviderSummary

  const reportRefreshDate = copilotUsage.value?.[0]?.reportRefreshDate ?? null

  return {
    providerSummary,
    providerStatus: buildProviderStatus({
      provider: integration.provider,
      capability: 'license',
      status: 'fresh',
      message: reportRefreshDate
        ? `Microsoft Copilot activity refreshed on ${reportRefreshDate}.`
        : 'Microsoft Copilot activity loaded successfully.',
      asOf: reportRefreshDate ?? new Date().toISOString(),
    }),
    renewalAlert: buildRenewalAlert('Microsoft Copilot', integration),
  }
}

async function analyzeGoogleLicenseIntegration(
  integration: IntegrationRecord
): Promise<ProviderLicenseAnalysis> {
  const freshIntegration = await ensureFreshIntegration(integration)
  const googleSummary = await getGoogleLicenseActivitySummary(freshIntegration.access_token)

  const providerSummary = {
    provider: 'Google Workspace Gemini',
    billingBasis: 'seat',
    unitLabel: 'seats',
    totalUnits: googleSummary.totalSeats,
    activeUnits: googleSummary.activeSeats,
    dormantUnits: googleSummary.dormantSeats,
    utilizationRate: googleSummary.utilizationRate,
    estimatedAnnualCost: null,
    optimizationOpportunity: null,
    recommendation: googleSummary.totalSeats === 0
      ? `No Gemini licenses were detected across ${googleSummary.totalDomainUsers} Google Workspace users.`
      : googleSummary.dormantSeats > 10
        ? `${googleSummary.dormantSeats} Gemini seats were inactive in the last 30 days. Review assignments before renewal. Pricing is not modeled in this build.`
        : `Gemini utilization is ${googleSummary.utilizationRate}% across ${googleSummary.totalSeats} licensed users. Pricing is not modeled in this build.`,
    pricingCoverage: 'unmodeled',
    coverageRate: null,
    totalInputTokens: null,
    totalOutputTokens: null,
    totalRequests: null,
    modelCount: null,
    modeledModelCount: null,
    totalSeats: googleSummary.totalSeats,
    activeSeats: googleSummary.activeSeats,
    dormantSeats: googleSummary.dormantSeats,
    potentialSavingsAtRenewal: null,
  } satisfies LicenseProviderSummary

  return {
    providerSummary,
    providerStatus: buildProviderStatus({
      provider: integration.provider,
      capability: 'license',
      status: 'fresh',
      message: googleSummary.totalSeats > 0
        ? `Google Workspace Gemini seat data loaded through ${googleSummary.latestCompleteDay}. ${googleSummary.activeSeats} of ${googleSummary.totalSeats} licensed users were active in the last 30 days.`
        : `Google Workspace license data loaded through ${googleSummary.latestCompleteDay}, but no Gemini licenses were detected.`,
      coverageStart: googleSummary.coverageStart,
      coverageEnd: googleSummary.coverageEnd,
      latestCompleteDay: googleSummary.latestCompleteDay,
      asOf: googleSummary.asOf,
    }),
    renewalAlert: buildRenewalAlert('Google Workspace', integration),
  }
}

function buildUsageProviderSummary(modeledProvider: ModeledProviderSpend): LicenseProviderSummary {
  const providerLabel = getUsageBillingProviderLabel(modeledProvider.provider)
  const highestCostModel = [...modeledProvider.modelBreakdown]
    .sort((left, right) => (right.estimatedCost ?? 0) - (left.estimatedCost ?? 0))[0] ?? null
  const coverageText = modeledProvider.coverageRate != null
    ? `${Math.round(modeledProvider.coverageRate)}% of token volume has matched pricing.`
    : 'Pricing coverage is pending.'

  const recommendation = modeledProvider.pricingCoverage === 'partial'
    ? `${providerLabel} spend is partially modeled. ${coverageText}`
    : modeledProvider.pricingCoverage === 'unmodeled'
      ? `${providerLabel} usage was detected, but the current model set does not match the pricing library yet.`
      : highestCostModel
        ? `${providerLabel} spend is concentrated in ${highestCostModel.model}. Review whether its current workload requires that capability tier.`
        : `${providerLabel} usage billing is modeled from token totals.`

  return {
    provider: providerLabel,
    billingBasis: 'usage',
    unitLabel: 'requests',
    totalUnits: modeledProvider.totalRequests,
    activeUnits: modeledProvider.totalRequests,
    dormantUnits: null,
    utilizationRate: null,
    estimatedAnnualCost: modeledProvider.estimatedAnnualCost,
    optimizationOpportunity: null,
    recommendation,
    pricingCoverage: modeledProvider.pricingCoverage,
    coverageRate: modeledProvider.coverageRate,
    totalInputTokens: modeledProvider.totalInputTokens,
    totalOutputTokens: modeledProvider.totalOutputTokens,
    totalRequests: modeledProvider.totalRequests,
    modelCount: modeledProvider.modelCount,
    modeledModelCount: modeledProvider.modeledModelCount,
    totalSeats: null,
    activeSeats: null,
    dormantSeats: null,
    potentialSavingsAtRenewal: null,
  }
}

async function collectUsageBillingInputs(
  integrations: IntegrationRecord[],
  usageRecords: UsageSpendRecord[],
  demoRunIndex: number
) {
  const usageByProvider = usageRecords.reduce((accumulator, record) => {
    const provider = record.provider.toLowerCase()
    if (!accumulator[provider]) {
      accumulator[provider] = []
    }
    accumulator[provider].push(record)
    return accumulator
  }, {} as Record<string, UsageSpendRecord[]>)

  const openAIIntegration = integrations.find((integration) => integration.provider === 'openai')
  if (openAIIntegration && !usageByProvider.openai) {
    const freshIntegration = await ensureFreshIntegration(openAIIntegration)
    const usage = await getOpenAIUsage(freshIntegration.access_token, 30, demoRunIndex)
    usageByProvider.openai = usage.normalizedUsage
  }

  return Object.values(usageByProvider).flat()
}

export async function runLicenseIntelligence(
  integrations: IntegrationRecord[],
  {
    usageRecords = [],
    demoRunIndex = 1,
  }: {
    usageRecords?: UsageSpendRecord[]
    demoRunIndex?: number
  } = {}
): Promise<LicenseIntelligenceResult> {
  const seatIntegrations = integrations.filter((record) =>
    record.provider === 'microsoft' || record.provider === 'google'
  )
  const results: LicenseIntelligenceResult = {
    providers: [],
    totalLicensedSeats: 0,
    totalActiveSeats: 0,
    totalDormantSeats: 0,
    overallUtilizationRate: null,
    estimatedAnnualLicenseCost: null,
    potentialAnnualSavings: null,
    estimatedAnnualSpend: null,
    potentialAnnualOptimization: null,
    pricingCoverage: 'none',
    pricedProviderCount: 0,
    optimizationProviderCount: 0,
    renewalAlerts: [],
    providerStatus: [],
    availability: buildUnavailableSection(buildLicenseUnavailableMessage(integrations)),
  }

  for (const integration of integrations) {
    if (!supportsProviderCapability(integration.provider, 'license')) {
      results.providerStatus.push(
        buildUnsupportedProviderStatus(
          integration.provider,
          'license',
          buildUnsupportedLicenseMessage(integration.provider)
        )
      )
    }
  }

  for (const integration of seatIntegrations) {
    try {
      const providerResult = integration.provider === 'google'
        ? await analyzeGoogleLicenseIntegration(integration)
        : await analyzeMicrosoftLicenseIntegration(integration)

      results.providers.push(providerResult.providerSummary)
      results.providerStatus.push(providerResult.providerStatus)

      if (providerResult.renewalAlert) {
        results.renewalAlerts.push(providerResult.renewalAlert)
      }

      results.totalLicensedSeats += providerResult.providerSummary.totalSeats ?? 0
      results.totalActiveSeats += providerResult.providerSummary.activeSeats ?? 0
      results.totalDormantSeats += providerResult.providerSummary.dormantSeats ?? 0
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown license intelligence failure'
      if (integration.provider === 'google') {
        throw new Error(`Google Workspace license analysis failed: ${message}`)
      }
      throw new Error(`Microsoft license analysis failed: ${message}`)
    }
  }

  const modeledUsageProviders = buildModeledProviderSpend(
    await collectUsageBillingInputs(integrations, usageRecords, demoRunIndex)
  )
  const usageProviderSummaries = modeledUsageProviders.map(buildUsageProviderSummary)

  for (const summary of usageProviderSummaries) {
    results.providers.push(summary)
    results.providerStatus.push(
      buildProviderStatus({
        provider: summary.provider.toLowerCase(),
        capability: 'license',
        status: summary.pricingCoverage === 'unmodeled' ? 'unsupported' : 'fresh',
        message: summary.pricingCoverage === 'unmodeled'
          ? `${summary.provider} usage was detected, but billing could not be modeled for the current model mix.`
          : `${summary.provider} billing was modeled from token usage totals.`,
        asOf: new Date().toISOString(),
      })
    )
  }

  if (results.providers.length === 0) {
    return results
  }

  if (results.totalLicensedSeats > 0) {
    results.overallUtilizationRate = Math.round((results.totalActiveSeats / results.totalLicensedSeats) * 100)
  }

  const spendProviders = results.providers.filter((provider) => provider.estimatedAnnualCost != null)
  const optimizationProviders = results.providers.filter((provider) => provider.optimizationOpportunity != null)

  results.pricedProviderCount = spendProviders.length
  results.optimizationProviderCount = optimizationProviders.length
  results.estimatedAnnualSpend = spendProviders.length > 0
    ? spendProviders.reduce((sum, provider) => sum + (provider.estimatedAnnualCost ?? 0), 0)
    : null
  results.potentialAnnualOptimization = optimizationProviders.length > 0
    ? optimizationProviders.reduce((sum, provider) => sum + (provider.optimizationOpportunity ?? 0), 0)
    : null
  results.estimatedAnnualLicenseCost = results.estimatedAnnualSpend
  results.potentialAnnualSavings = results.potentialAnnualOptimization
  results.pricingCoverage = spendProviders.length === 0
    ? 'none'
    : results.providers.every((provider) => provider.pricingCoverage === 'modeled')
      ? 'full'
      : 'partial'
  results.availability = buildAvailableSection(
    results.providers.some((provider) => provider.billingBasis === 'usage')
      ? 'Supported billing and license data loaded successfully.'
      : 'Supported license data loaded successfully.'
  )

  return results
}
