import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import {
  DashboardBadge,
  DashboardBarRow,
  DashboardEmptyState,
  DashboardFilterBar,
  DashboardFilterPill,
  DashboardHeader,
  DashboardMetaPill,
  DashboardMiniStat,
  DashboardPage,
  DashboardPanel,
  DashboardStatCard,
  DashboardStatGrid,
  DashboardTable,
  formatCompactNumber,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '@/components/dashboard/DashboardPrimitives'
import { DashboardFilterSelect } from '@/components/dashboard/DashboardFilterSelect'
import RerunAnalysisButton from '@/components/dashboard/RerunAnalysisButton'
import { AnimatedSection } from '@/components/dashboard/AnimatedSection'
import SectionAvailabilityNotice from '@/components/dashboard/SectionAvailabilityNotice'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import { getCompanyReports } from '@/lib/reports/get-company-reports'
import { getSectionAvailability } from '@/lib/reports/report-availability'
import {
  AlertTriangle,
  DollarSign,
  Gauge,
  Receipt,
} from 'lucide-react'

interface ProviderSummary {
  provider: string
  billingBasis?: 'seat' | 'usage'
  unitLabel?: 'seats' | 'requests'
  totalUnits?: number | null
  activeUnits?: number | null
  dormantUnits?: number | null
  utilizationRate?: number | null
  estimatedAnnualCost?: number | null
  optimizationOpportunity?: number | null
  recommendation: string
  pricingCoverage?: 'modeled' | 'partial' | 'unmodeled'
  coverageRate?: number | null
  totalInputTokens?: number | null
  totalOutputTokens?: number | null
  totalRequests?: number | null
  modelCount?: number | null
  modeledModelCount?: number | null
  totalSeats?: number | null
  activeSeats?: number | null
  dormantSeats?: number | null
  potentialSavingsAtRenewal?: number | null
}

interface LicenseSummary {
  providers: ProviderSummary[]
  totalLicensedSeats: number
  totalActiveSeats: number
  totalDormantSeats: number
  overallUtilizationRate: number | null
  estimatedAnnualLicenseCost: number | null
  potentialAnnualSavings: number | null
  estimatedAnnualSpend?: number | null
  potentialAnnualOptimization?: number | null
  pricingCoverage?: 'full' | 'partial' | 'none'
  pricedProviderCount?: number
  optimizationProviderCount?: number
  renewalAlerts: { provider: string; monthsToRenewal: number; renewalDate: string; actionRequired: string }[]
}

interface LicensesPageProps {
  searchParams?: Promise<{ reportId?: string; provider?: string }>
}

function getProviderBasis(provider: ProviderSummary) {
  if (provider.billingBasis) return provider.billingBasis
  return provider.totalSeats != null ? 'seat' : 'usage'
}

function getProviderTotalUnits(provider: ProviderSummary) {
  return provider.totalUnits ?? provider.totalSeats ?? provider.totalRequests ?? null
}

function getProviderActiveUnits(provider: ProviderSummary) {
  return provider.activeUnits ?? provider.activeSeats ?? provider.totalRequests ?? null
}

function getProviderDormantUnits(provider: ProviderSummary) {
  return provider.dormantUnits ?? provider.dormantSeats ?? null
}

function getProviderOptimization(provider: ProviderSummary) {
  return provider.optimizationOpportunity ?? provider.potentialSavingsAtRenewal ?? null
}

function formatCoverageLabel(provider: ProviderSummary) {
  if (provider.pricingCoverage === 'modeled') return 'Modeled'
  if (provider.pricingCoverage === 'partial') {
    return provider.coverageRate != null ? `${formatPercent(provider.coverageRate, 0)} priced` : 'Partial'
  }
  return 'Pending'
}

function getProviderMetricLabel(provider: ProviderSummary) {
  return getProviderBasis(provider) === 'seat'
    ? `${formatPercent(provider.utilizationRate, 0)} utilized`
    : formatCurrency(provider.estimatedAnnualCost)
}

function getProviderMetricPercentage(provider: ProviderSummary, totalSpend: number | null) {
  if (getProviderBasis(provider) === 'seat') {
    return provider.utilizationRate ?? 0
  }

  if (provider.estimatedAnnualCost != null && totalSpend != null && totalSpend > 0) {
    return (provider.estimatedAnnualCost / totalSpend) * 100
  }

  return provider.coverageRate ?? 0
}

function getProviderMetricHint(provider: ProviderSummary) {
  if (getProviderBasis(provider) === 'seat') {
    const activeUnits = getProviderActiveUnits(provider)
    const totalUnits = getProviderTotalUnits(provider)
    const dormantUnits = getProviderDormantUnits(provider)
    return `${formatNumber(activeUnits, 0)}/${formatNumber(totalUnits, 0)} active seats · ${formatNumber(dormantUnits, 0)} dormant`
  }

  return `${formatCompactNumber(provider.totalRequests, 1)} requests · ${formatNumber(provider.modeledModelCount, 0)}/${formatNumber(provider.modelCount, 0)} models priced`
}

export default async function LicensesPage({ searchParams }: LicensesPageProps) {
  const params = await searchParams
  const requestedReportId = params?.reportId ?? null
  const providerFilter = params?.provider ?? 'all'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const [report, availableReports] = await Promise.all([
    getPreferredReport(supabase, company!.id, requestedReportId),
    getCompanyReports(supabase, company!.id),
  ])
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const sectionAvailability = getSectionAvailability(report)
  const licenseAvailable = sectionAvailability.license.status === 'available'
  const license = report.license_intelligence as LicenseSummary | null
  const providers = [...(license?.providers ?? [])].sort((left, right) => {
    const spendDelta = (right.estimatedAnnualCost ?? 0) - (left.estimatedAnnualCost ?? 0)
    if (spendDelta !== 0) return spendDelta
    return (right.utilizationRate ?? 0) - (left.utilizationRate ?? 0)
  })
  const filteredProviders = providerFilter === 'all'
    ? providers
    : providers.filter((provider) => provider.provider === providerFilter)
  const selectedProvider = providerFilter !== 'all'
    ? providers.find((provider) => provider.provider === providerFilter) ?? null
    : null
  const filteredRenewalAlerts = (license?.renewalAlerts ?? []).filter((item) => (
    providerFilter === 'all' || item.provider === providerFilter
  ))
  const urgentRenewals = filteredRenewalAlerts.filter((item) => item.monthsToRenewal <= 3)
  const seatProviders = filteredProviders.filter((provider) => getProviderBasis(provider) === 'seat')
  const usageProviders = filteredProviders.filter((provider) => getProviderBasis(provider) === 'usage')
  const computedSeatTotals = seatProviders.reduce((totals, provider) => ({
    total: totals.total + (getProviderTotalUnits(provider) ?? 0),
    active: totals.active + (getProviderActiveUnits(provider) ?? 0),
    dormant: totals.dormant + (getProviderDormantUnits(provider) ?? 0),
  }), { total: 0, active: 0, dormant: 0 })
  const computedSeatUtilization = computedSeatTotals.total > 0
    ? (computedSeatTotals.active / computedSeatTotals.total) * 100
    : null
  const computedAnnualSpend = filteredProviders.reduce((sum, provider) => sum + (provider.estimatedAnnualCost ?? 0), 0)
  const computedOptimization = filteredProviders.reduce((sum, provider) => sum + (getProviderOptimization(provider) ?? 0), 0)
  const pricingCoverage = license?.pricingCoverage ?? (
    providers.length === 0
      ? 'none'
      : providers.every((provider) => provider.pricingCoverage === 'modeled')
        ? 'full'
        : 'partial'
  )
  const displayAnnualSpend = selectedProvider
    ? selectedProvider.estimatedAnnualCost ?? null
    : license?.estimatedAnnualSpend
      ?? license?.estimatedAnnualLicenseCost
      ?? (computedAnnualSpend > 0 ? computedAnnualSpend : null)
  const displayOptimization = selectedProvider
    ? getProviderOptimization(selectedProvider)
    : license?.potentialAnnualOptimization
      ?? license?.potentialAnnualSavings
      ?? (computedOptimization > 0 ? computedOptimization : null)
  const displaySeatUtilization = selectedProvider
    ? (getProviderBasis(selectedProvider) === 'seat' ? selectedProvider.utilizationRate ?? null : null)
    : license?.overallUtilizationRate ?? computedSeatUtilization
  const optimizedSpend = displayAnnualSpend != null && displayOptimization != null
    ? Math.max(0, displayAnnualSpend - displayOptimization)
    : null
  const savingsRate = displayAnnualSpend != null && displayOptimization != null && displayAnnualSpend > 0
    ? (displayOptimization / displayAnnualSpend) * 100
    : null
  const modeledProviderCount = filteredProviders.filter((provider) => provider.pricingCoverage !== 'unmodeled').length
  const optimizationActions = filteredProviders
    .filter((provider) => (
      (getProviderOptimization(provider) ?? 0) > 0 ||
      provider.pricingCoverage === 'partial' ||
      ((provider.utilizationRate ?? 100) < 80)
    ))
    .slice(0, 4)
  const earliestRenewal = [...filteredRenewalAlerts].sort((left, right) => left.monthsToRenewal - right.monthsToRenewal)[0] ?? null

  return (
    <DashboardPage>
      <div className="space-y-5">
        <DashboardHeader
          title="Billing and license intelligence"
          subtitle={`${company!.name} · ${report.reporting_period}. Compare seat utilization alongside modeled API billing across the AI portfolio.`}
          badge={<DashboardMetaPill>{providers.length > 0 ? `${providers.length} providers modeled` : 'Awaiting billing detail'}</DashboardMetaPill>}
          actions={<RerunAnalysisButton initialJobState={analysisJob} />}
        />

        <Suspense>
          <DashboardFilterBar>
            <DashboardFilterSelect
              label="Provider"
              paramKey="provider"
              value={providerFilter}
              options={[
                { label: 'All Providers', value: 'all' },
                ...providers.map((provider) => ({ label: provider.provider, value: provider.provider })),
              ]}
            />
            <DashboardFilterSelect
              label="Period"
              paramKey="reportId"
              value={requestedReportId ?? 'all'}
              options={[
                { label: `${report.reporting_period} (latest)`, value: 'all' },
                ...availableReports.filter((item) => item.id !== report.id).map((item) => ({ label: item.reporting_period, value: item.id })),
              ]}
            />
            <DashboardFilterPill
              label="Coverage"
              value={pricingCoverage === 'full' ? 'Full pricing coverage' : pricingCoverage === 'partial' ? 'Partial pricing coverage' : 'Pricing pending'}
            />
          </DashboardFilterBar>
        </Suspense>

        {!licenseAvailable && (
          <SectionAvailabilityNotice
            title="Billing analysis unavailable"
            message={sectionAvailability.license.message ?? 'Connect OpenAI, Microsoft 365, or Google Workspace and rerun analysis to populate this section.'}
          />
        )}

        <AnimatedSection animKey={providerFilter}>
          <DashboardStatGrid>
            <DashboardStatCard
              label="Modeled Spend"
              value={displayAnnualSpend != null ? formatCurrency(displayAnnualSpend, true) : '—'}
              unit="annualized billing"
              helper={selectedProvider ? `${selectedProvider.provider} modeled spend` : 'Combined spend across priced providers'}
              icon={<DollarSign className="h-4 w-4" />}
              statusLabel={modeledProviderCount > 0 ? `${modeledProviderCount} provider${modeledProviderCount !== 1 ? 's' : ''} priced` : 'Pricing pending'}
              statusTone={modeledProviderCount > 0 ? 'good' : 'warning'}
            />
            <DashboardStatCard
              label="Optimization"
              value={displayOptimization != null ? formatCurrency(displayOptimization, true) : '—'}
              unit="recoverable opportunity"
              helper={selectedProvider ? `${selectedProvider.provider} modeled opportunity` : 'Seat-rightsizing opportunity'}
              icon={<Receipt className="h-4 w-4" />}
              statusLabel={savingsRate != null ? `${formatPercent(savingsRate, 0)} of spend` : 'Not modeled for every provider'}
            />
            <DashboardStatCard
              label="Seat Utilization"
              value={displaySeatUtilization != null ? formatNumber(displaySeatUtilization, 0) : '—'}
              unit="% active seats"
              helper="Shown when seat-based products are connected"
              icon={<Gauge className="h-4 w-4" />}
              statusLabel={computedSeatTotals.total > 0 ? `${formatNumber(computedSeatTotals.active, 0)} active of ${formatNumber(computedSeatTotals.total, 0)}` : 'No seat products selected'}
              statusTone={displaySeatUtilization != null && displaySeatUtilization >= 75 ? 'good' : 'warning'}
            />
            <DashboardStatCard
              label="Coverage"
              value={providers.length > 0 ? formatNumber(modeledProviderCount, 0) : '—'}
              unit="providers with billing"
              helper="Providers with priced seat or token coverage"
              icon={<AlertTriangle className="h-4 w-4" />}
              statusLabel={pricingCoverage === 'full' ? 'All connected providers covered' : pricingCoverage === 'partial' ? 'Some providers partially priced' : 'No current pricing coverage'}
              statusTone={pricingCoverage === 'full' ? 'good' : 'warning'}
            />
          </DashboardStatGrid>
        </AnimatedSection>

        {!license || providers.length === 0 ? (
          <DashboardEmptyState
            title="No billing or license data available yet"
            message="Connect OpenAI, Microsoft 365, or Google Workspace to see modeled spend, seat utilization, renewal timing, and optimization opportunities."
          />
        ) : (
          <AnimatedSection animKey={providerFilter}>
            <>
              <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
                <DashboardPanel
                  title="Portfolio mix"
                  subtitle="Where spend visibility, seat utilization, and coverage are strongest across the current AI portfolio."
                  badge={<DashboardBadge tone={pricingCoverage === 'full' ? 'green' : 'amber'}>{pricingCoverage === 'full' ? 'Coverage modeled' : 'Coverage still partial'}</DashboardBadge>}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <DashboardMiniStat
                      label="Seat providers"
                      value={formatNumber(seatProviders.length, 0)}
                      hint="Microsoft or Google seat-based products."
                    />
                    <DashboardMiniStat
                      label="Usage providers"
                      value={formatNumber(usageProviders.length, 0)}
                      hint="Providers modeled from API token usage."
                      tone="good"
                    />
                    <DashboardMiniStat
                      label="Modeled providers"
                      value={formatNumber(modeledProviderCount, 0)}
                      hint="Providers with priced spend visibility."
                      tone={modeledProviderCount > 0 ? 'good' : 'default'}
                    />
                    <DashboardMiniStat
                      label="Soonest renewal"
                      value={earliestRenewal ? `${earliestRenewal.monthsToRenewal} mo` : '—'}
                      hint={earliestRenewal?.provider ?? 'No renewal alerts tracked'}
                      tone={earliestRenewal && earliestRenewal.monthsToRenewal <= 3 ? 'warning' : 'default'}
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    {filteredProviders.map((provider) => (
                      <DashboardBarRow
                        key={provider.provider}
                        label={provider.provider}
                        value={getProviderMetricLabel(provider)}
                        percentage={getProviderMetricPercentage(provider, displayAnnualSpend)}
                        tone={getProviderBasis(provider) === 'seat' ? ((provider.utilizationRate ?? 100) < 75 ? 'amber' : 'green') : (provider.pricingCoverage === 'partial' ? 'amber' : 'green')}
                        hint={getProviderMetricHint(provider)}
                      />
                    ))}
                  </div>
                </DashboardPanel>

                <DashboardPanel
                  title="Spend and optimization"
                  subtitle="Modeled annual spend, the optimization currently quantified, and how much pricing coverage exists behind those figures."
                  badge={<DashboardMetaPill>{optimizedSpend != null ? `${formatCurrency(optimizedSpend, true)} optimized spend` : 'Optimization still partial'}</DashboardMetaPill>}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <DashboardMiniStat
                      label="Current annual spend"
                      value={formatCurrency(displayAnnualSpend)}
                      hint="Includes seat pricing and modeled token billing where available."
                    />
                    <DashboardMiniStat
                      label="Optimization"
                      value={formatCurrency(displayOptimization)}
                      hint="Renewal savings and other directly-modeled opportunity."
                      tone="good"
                    />
                    <DashboardMiniStat
                      label="Optimized spend"
                      value={formatCurrency(optimizedSpend)}
                      hint="Current spend less modeled opportunity."
                      tone="good"
                    />
                    <DashboardMiniStat
                      label="Pricing coverage"
                      value={pricingCoverage === 'full' ? 'Full' : pricingCoverage === 'partial' ? 'Partial' : 'None'}
                      hint={license.pricedProviderCount != null ? `${license.pricedProviderCount} provider${license.pricedProviderCount !== 1 ? 's' : ''} priced` : 'Coverage based on connected providers'}
                      tone={pricingCoverage === 'full' ? 'good' : 'warning'}
                    />
                  </div>

                  {displayAnnualSpend != null && (
                    <div className="mt-4 space-y-3">
                      <DashboardBarRow
                        label="Current spend"
                        value={formatCurrency(displayAnnualSpend)}
                        percentage={100}
                        tone="slate"
                        hint="Current modeled annual spend."
                      />
                      {optimizedSpend != null && (
                        <DashboardBarRow
                          label="Optimized spend"
                          value={formatCurrency(optimizedSpend)}
                          percentage={displayAnnualSpend > 0 ? (optimizedSpend / displayAnnualSpend) * 100 : 0}
                          tone="green"
                          hint="Modeled spend after current quantified opportunities are captured."
                        />
                      )}
                    </div>
                  )}
                </DashboardPanel>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <DashboardPanel
                  title="Provider detail board"
                  subtitle="Provider-level activity, spend coverage, and optimization notes from the current report."
                  badge={<DashboardMetaPill>{filteredProviders.length} providers</DashboardMetaPill>}
                >
                  <div className="space-y-3">
                    {filteredProviders.map((provider) => {
                      const providerBasis = getProviderBasis(provider)
                      const optimizationOpportunity = getProviderOptimization(provider)
                      return (
                        <div key={provider.provider} className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-[#152820]">{provider.provider}</p>
                              <p className="mt-1 text-sm leading-6 text-[#2e4a40]">{provider.recommendation}</p>
                            </div>
                            <DashboardBadge tone={providerBasis === 'seat' ? ((provider.utilizationRate ?? 100) < 75 ? 'amber' : 'green') : (provider.pricingCoverage === 'partial' ? 'amber' : 'blue')}>
                              {providerBasis === 'seat' ? 'Seat product' : 'Usage billing'}
                            </DashboardBadge>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            {providerBasis === 'seat' ? (
                              <>
                                <DashboardMiniStat
                                  label="Seat mix"
                                  value={`${formatNumber(getProviderActiveUnits(provider), 0)}/${formatNumber(getProviderTotalUnits(provider), 0)}`}
                                  hint={`${formatNumber(getProviderDormantUnits(provider), 0)} dormant seats`}
                                />
                                <DashboardMiniStat
                                  label="Annual cost"
                                  value={formatCurrency(provider.estimatedAnnualCost)}
                                  hint="Modeled provider spend."
                                />
                                <DashboardMiniStat
                                  label="Renewal savings"
                                  value={formatCurrency(optimizationOpportunity)}
                                  hint="Potential savings at next renewal."
                                  tone="good"
                                />
                              </>
                            ) : (
                              <>
                                <DashboardMiniStat
                                  label="Requests"
                                  value={formatCompactNumber(provider.totalRequests, 1)}
                                  hint={`${formatCompactNumber((provider.totalInputTokens ?? 0) + (provider.totalOutputTokens ?? 0), 1)} tokens in scope`}
                                />
                                <DashboardMiniStat
                                  label="Model coverage"
                                  value={`${formatNumber(provider.modeledModelCount, 0)}/${formatNumber(provider.modelCount, 0)}`}
                                  hint={formatCoverageLabel(provider)}
                                  tone={provider.pricingCoverage === 'modeled' ? 'good' : 'warning'}
                                />
                                <DashboardMiniStat
                                  label="Modeled spend"
                                  value={formatCurrency(provider.estimatedAnnualCost)}
                                  hint="Derived from provider token totals and current pricing."
                                  tone="good"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </DashboardPanel>

                <DashboardPanel
                  title="Renewal radar"
                  subtitle="Subscriptions nearing renewal and where seat-rightsizing timing matters most."
                  badge={<DashboardBadge tone={urgentRenewals.length > 0 ? 'amber' : 'green'}>{urgentRenewals.length > 0 ? `${urgentRenewals.length} urgent renewals` : 'No urgent renewals'}</DashboardBadge>}
                >
                  {filteredRenewalAlerts.length > 0 ? (
                    <div className="space-y-3">
                      {filteredRenewalAlerts.map((alert, index) => (
                        <div key={`${alert.provider}-${index}`} className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-[#152820]">{alert.provider}</p>
                              <p className="mt-1 text-sm leading-6 text-[#2e4a40]">{alert.actionRequired}</p>
                            </div>
                            <DashboardBadge tone={alert.monthsToRenewal <= 3 ? 'amber' : 'slate'}>
                              {alert.monthsToRenewal} months
                            </DashboardBadge>
                          </div>
                          <p className="mt-3 text-xs font-medium text-[#4a5e56]">Renewal date: {alert.renewalDate}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <DashboardEmptyState
                      title="No renewal alerts are currently modeled"
                      message="Renewal timing will appear here when GreenLens has enough provider and contract context."
                    />
                  )}
                </DashboardPanel>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <DashboardPanel
                  title="Optimization actions"
                  subtitle="The clearest places to recover value based on dormant seats, partial pricing coverage, or provider-level recommendations."
                  badge={<DashboardBadge tone={optimizationActions.length > 0 ? 'amber' : 'green'}>{optimizationActions.length > 0 ? 'Action opportunities surfaced' : 'Portfolio looks stable'}</DashboardBadge>}
                >
                  {optimizationActions.length > 0 ? (
                    <div className="space-y-3">
                      {optimizationActions.map((provider) => (
                        <DashboardBarRow
                          key={provider.provider}
                          label={provider.provider}
                          value={getProviderBasis(provider) === 'seat'
                            ? `${formatNumber(getProviderDormantUnits(provider), 0)} dormant`
                            : formatCoverageLabel(provider)}
                          percentage={getProviderBasis(provider) === 'seat'
                            ? (getProviderTotalUnits(provider) ? ((getProviderDormantUnits(provider) ?? 0) / (getProviderTotalUnits(provider) ?? 1)) * 100 : 0)
                            : (provider.coverageRate ?? 0)}
                          tone={getProviderBasis(provider) === 'seat' ? 'amber' : (provider.pricingCoverage === 'modeled' ? 'green' : 'amber')}
                          hint={provider.recommendation}
                        />
                      ))}
                    </div>
                  ) : (
                    <DashboardEmptyState
                      title="No immediate optimization actions surfaced"
                      message="GreenLens did not identify a clear billing or rightsizing intervention this period."
                    />
                  )}
                </DashboardPanel>

                <DashboardPanel
                  title="Billing ledger"
                  subtitle="Provider-level basis, activity, spend, and coverage in one comparable table."
                  badge={<DashboardMetaPill>{filteredProviders.length} providers</DashboardMetaPill>}
                >
                  <DashboardTable
                    headers={['Provider', 'Basis', 'Coverage', 'Activity', 'Spend', 'Opportunity']}
                    rows={filteredProviders.map((provider) => [
                      <span key={`${provider.provider}-name`} className="font-medium text-[#152820]">{provider.provider}</span>,
                      <span key={`${provider.provider}-basis`} className="text-[#2e4a40]">{getProviderBasis(provider) === 'seat' ? 'Seat' : 'Usage'}</span>,
                      <span key={`${provider.provider}-coverage`} className="text-[#2e4a40]">{formatCoverageLabel(provider)}</span>,
                      <span key={`${provider.provider}-activity`} className="text-[#2e4a40]">
                        {getProviderBasis(provider) === 'seat'
                          ? `${formatNumber(getProviderActiveUnits(provider), 0)}/${formatNumber(getProviderTotalUnits(provider), 0)} active · ${formatNumber(getProviderDormantUnits(provider), 0)} dormant`
                          : `${formatCompactNumber(provider.totalRequests, 1)} requests · ${formatNumber(provider.modelCount, 0)} models`}
                      </span>,
                      <span key={`${provider.provider}-cost`} className="text-[#2e4a40]">{formatCurrency(provider.estimatedAnnualCost)}</span>,
                      <span key={`${provider.provider}-savings`} className="text-emerald-700">{formatCurrency(getProviderOptimization(provider))}</span>,
                    ])}
                  />
                </DashboardPanel>
              </div>
            </>
          </AnimatedSection>
        )}
      </div>
    </DashboardPage>
  )
}
