import { getGoogleLicenseActivitySummary } from '@/lib/integrations/google'
import {
  getMicrosoftCopilotUsage,
  getMicrosoftLicenseDetails,
} from '@/lib/integrations/microsoft'
import {
  buildAvailableSection,
  buildProviderStatus,
  buildUnavailableSection,
  buildUnsupportedProviderStatus,
  supportsProviderCapability,
  type ProviderAnalysisStatus,
  type SectionAvailability,
} from '@/lib/analysis/provider-status'
import { ensureFreshIntegration } from '@/lib/integrations/tokens'
import type { IntegrationRecord } from '@/lib/integrations/types'

interface LicenseProviderSummary {
  provider: string
  totalSeats: number
  activeSeats: number
  dormantSeats: number
  utilizationRate: number
  estimatedAnnualCost: number | null
  potentialSavingsAtRenewal: number | null
  recommendation: string
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
  overallUtilizationRate: number
  estimatedAnnualLicenseCost: number | null
  potentialAnnualSavings: number | null
  renewalAlerts: RenewalAlert[]
  providerStatus: ProviderAnalysisStatus[]
  availability: SectionAvailability
}

function buildUnsupportedLicenseMessage(provider: string) {
  if (provider === 'openai') {
    return 'OpenAI is connected for usage analysis, but does not provide license-seat analysis.'
  }

  return `${provider} is connected, but automated license analysis is not implemented in this build.`
}

function buildLicenseUnavailableMessage(integrations: IntegrationRecord[]) {
  if (integrations.length === 0) {
    return 'Connect Microsoft 365 or Google Workspace to unlock license utilization reporting.'
  }

  const connectedProviders = integrations.map((integration) => integration.provider)
  const providerList = connectedProviders.join(', ')

  return `Connected providers (${providerList}) do not currently expose supported license analysis in this build. Connect Microsoft 365 or Google Workspace to unlock license utilization reporting.`
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
    totalSeats: licenseData.totalSeats,
    activeSeats,
    dormantSeats,
    utilizationRate,
    estimatedAnnualCost: licenseData.estimatedAnnualCost,
    potentialSavingsAtRenewal: dormantSeats * 30 * 12,
    recommendation: dormantSeats > 20
      ? `Right-size from ${licenseData.totalSeats} to ${activeSeats + 10} seats at renewal. Estimated saving: $${((dormantSeats - 10) * 30 * 12).toLocaleString()}/year.`
      : `Utilization healthy at ${utilizationRate}%. Monitor at next renewal.`,
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
    renewalAlert: buildRenewalAlert('Microsoft 365', integration),
  }
}

async function analyzeGoogleLicenseIntegration(
  integration: IntegrationRecord
): Promise<ProviderLicenseAnalysis> {
  const freshIntegration = await ensureFreshIntegration(integration)
  const googleSummary = await getGoogleLicenseActivitySummary(freshIntegration.access_token)

  const providerSummary = {
    provider: 'Google Workspace Gemini',
    totalSeats: googleSummary.totalSeats,
    activeSeats: googleSummary.activeSeats,
    dormantSeats: googleSummary.dormantSeats,
    utilizationRate: googleSummary.utilizationRate,
    estimatedAnnualCost: null,
    potentialSavingsAtRenewal: null,
    recommendation: googleSummary.totalSeats === 0
      ? `No Gemini licenses were detected across ${googleSummary.totalDomainUsers} Google Workspace users.`
      : googleSummary.dormantSeats > 10
        ? `${googleSummary.dormantSeats} Gemini seats were inactive in the last 30 days. Review assignments before renewal. Pricing is not modeled in this build.`
        : `Gemini utilization is ${googleSummary.utilizationRate}% across ${googleSummary.totalSeats} licensed users. Pricing is not modeled in this build.`,
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

export async function runLicenseIntelligence(
  integrations: IntegrationRecord[]
): Promise<LicenseIntelligenceResult> {
  const licenseIntegrations = integrations.filter((record) =>
    supportsProviderCapability(record.provider, 'license')
  )
  const results: LicenseIntelligenceResult = {
    providers: [],
    totalLicensedSeats: 0,
    totalActiveSeats: 0,
    totalDormantSeats: 0,
    overallUtilizationRate: 0,
    estimatedAnnualLicenseCost: null,
    potentialAnnualSavings: null,
    renewalAlerts: [],
    providerStatus: [],
    availability: buildUnavailableSection(buildLicenseUnavailableMessage(integrations)),
  }

  let aggregateEstimatedAnnualLicenseCost = 0
  let aggregatePotentialAnnualSavings = 0
  let pricingCompleteForAllProviders = true

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

  for (const integration of licenseIntegrations) {
    try {
      const providerResult = integration.provider === 'google'
        ? await analyzeGoogleLicenseIntegration(integration)
        : await analyzeMicrosoftLicenseIntegration(integration)

      results.providers.push(providerResult.providerSummary)
      results.providerStatus.push(providerResult.providerStatus)

      if (providerResult.renewalAlert) {
        results.renewalAlerts.push(providerResult.renewalAlert)
      }

      results.totalLicensedSeats += providerResult.providerSummary.totalSeats
      results.totalActiveSeats += providerResult.providerSummary.activeSeats
      results.totalDormantSeats += providerResult.providerSummary.dormantSeats

      if (
        providerResult.providerSummary.estimatedAnnualCost == null ||
        providerResult.providerSummary.potentialSavingsAtRenewal == null
      ) {
        pricingCompleteForAllProviders = false
      } else {
        aggregateEstimatedAnnualLicenseCost += providerResult.providerSummary.estimatedAnnualCost
        aggregatePotentialAnnualSavings += providerResult.providerSummary.potentialSavingsAtRenewal
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown license intelligence failure'
      if (integration.provider === 'google') {
        throw new Error(`Google Workspace license analysis failed: ${message}`)
      }
      throw new Error(`Microsoft license analysis failed: ${message}`)
    }
  }

  if (licenseIntegrations.length === 0) {
    return results
  }

  results.overallUtilizationRate = results.totalLicensedSeats > 0
    ? Math.round((results.totalActiveSeats / results.totalLicensedSeats) * 100)
    : 0
  results.estimatedAnnualLicenseCost = pricingCompleteForAllProviders
    ? aggregateEstimatedAnnualLicenseCost
    : null
  results.potentialAnnualSavings = pricingCompleteForAllProviders
    ? aggregatePotentialAnnualSavings
    : null
  results.availability = buildAvailableSection(
    results.totalLicensedSeats > 0
      ? 'Supported license data loaded successfully.'
      : 'Supported license data loaded successfully with no licensed seats found.'
  )

  return results
}
