import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
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
  Users,
} from 'lucide-react'

interface LicensesPageProps {
  searchParams?: Promise<{ reportId?: string; provider?: string }>
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
  // license_intelligence is stored as the raw output from runLicenseIntelligence,
  // which uses camelCase field names.
  const license = report.license_intelligence as {
    providers: { provider: string; totalSeats: number; activeSeats: number; dormantSeats: number; utilizationRate: number; estimatedAnnualCost: number | null; potentialSavingsAtRenewal: number | null; recommendation: string }[]
    totalLicensedSeats: number
    totalActiveSeats: number
    totalDormantSeats: number
    overallUtilizationRate: number | null
    estimatedAnnualLicenseCost: number | null
    potentialAnnualSavings: number | null
    renewalAlerts: { provider: string; monthsToRenewal: number; renewalDate: string; actionRequired: string }[]
  } | null
  const providers = [...(license?.providers ?? [])].sort((a, b) => b.utilizationRate - a.utilizationRate)
  const filteredProviders = providerFilter === 'all' ? providers : providers.filter((p) => p.provider === providerFilter)
  const selectedProvider = providerFilter !== 'all' ? providers.find((p) => p.provider === providerFilter) ?? null : null

  // Compute portfolio totals from provider array as fallback when license-level aggregates are missing
  const computedTotalSeats = providers.reduce((sum, p) => sum + p.totalSeats, 0)
  const computedActiveSeats = providers.reduce((sum, p) => sum + p.activeSeats, 0)
  const computedDormantSeats = providers.reduce((sum, p) => sum + p.dormantSeats, 0)
  const computedUtilization = computedTotalSeats > 0 ? (computedActiveSeats / computedTotalSeats) * 100 : null
  const computedAnnualCost = providers.reduce((sum, p) => sum + (p.estimatedAnnualCost ?? 0), 0) || null
  const computedSavings = providers.reduce((sum, p) => sum + (p.potentialSavingsAtRenewal ?? 0), 0) || null

  // Stat card values: show selected provider's data when a provider is selected, fall back to computed totals
  const displayUtilization = selectedProvider?.utilizationRate ?? license?.overallUtilizationRate ?? computedUtilization ?? report.license_utilization_rate ?? null
  const displayTotalSeats = selectedProvider?.totalSeats ?? license?.totalLicensedSeats ?? (computedTotalSeats > 0 ? computedTotalSeats : null)
  const displayActiveSeats = selectedProvider?.activeSeats ?? license?.totalActiveSeats ?? (computedActiveSeats > 0 ? computedActiveSeats : null)
  const displayDormantSeats = selectedProvider?.dormantSeats ?? license?.totalDormantSeats ?? computedDormantSeats ?? null
  const displayAnnualCost = selectedProvider
    ? selectedProvider.estimatedAnnualCost
    : license?.estimatedAnnualLicenseCost ?? computedAnnualCost
  const displaySavings = selectedProvider
    ? selectedProvider.potentialSavingsAtRenewal
    : license?.potentialAnnualSavings ?? computedSavings

  const dormantShare = displayTotalSeats ? (displayDormantSeats! / displayTotalSeats) * 100 : null
  const activeShare = displayTotalSeats ? (displayActiveSeats! / displayTotalSeats) * 100 : null
  const optimizedSpend = displayAnnualCost != null && displaySavings != null
    ? Math.max(0, displayAnnualCost - displaySavings)
    : null
  const savingsRate = displayAnnualCost != null && displaySavings != null && displayAnnualCost > 0
    ? (displaySavings / displayAnnualCost) * 100
    : null
  const largestWasteProvider = [...filteredProviders].sort((a, b) => b.dormantSeats - a.dormantSeats)[0] ?? null
  const filteredRenewalAlerts = (license?.renewalAlerts ?? []).filter((item) => providerFilter === 'all' || item.provider === providerFilter)
  const urgentRenewals = filteredRenewalAlerts.filter((item) => item.monthsToRenewal <= 3)
  const optimizationActions = filteredProviders
    .filter((provider) => provider.utilizationRate < 80 || provider.dormantSeats > 0)
    .sort((a, b) => b.dormantSeats - a.dormantSeats)
    .slice(0, 4)

  return (
    <DashboardPage>
      <div className="space-y-5">
        <DashboardHeader
          title="License intelligence"
          subtitle={`${company!.name} · ${report.reporting_period}. Surface seat waste, renewal risk, and savings opportunities across the AI software portfolio.`}
          badge={<DashboardMetaPill>{providers.length > 0 ? `${providers.length} providers modeled` : 'Awaiting license detail'}</DashboardMetaPill>}
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
                ...providers.map((p) => ({ label: p.provider, value: p.provider })),
              ]}
            />
            <DashboardFilterSelect
              label="Period"
              paramKey="reportId"
              value={requestedReportId ?? 'all'}
              options={[
                { label: `${report.reporting_period} (latest)`, value: 'all' },
                ...availableReports.filter((r) => r.id !== report.id).map((r) => ({ label: r.reporting_period, value: r.id })),
              ]}
            />
            <DashboardFilterPill label="Primary Risk" value={urgentRenewals.length > 0 ? 'Renewal Pressure' : 'Utilization Review'} />
          </DashboardFilterBar>
        </Suspense>

        {!licenseAvailable && (
          <SectionAvailabilityNotice
            title="License analysis unavailable"
            message={sectionAvailability.license.message ?? 'Connect Microsoft 365 or Google Workspace and rerun analysis to populate this section.'}
          />
        )}

        <AnimatedSection animKey={providerFilter}>
        <DashboardStatGrid>
          <DashboardStatCard
            label="Utilization"
            value={displayUtilization != null ? formatNumber(displayUtilization, 0) : '—'}
            unit="% active seats"
            helper={selectedProvider ? `${selectedProvider.provider} engagement` : 'Overall license engagement'}
            icon={<Gauge className="h-4 w-4" />}
            statusLabel={displayUtilization != null && displayUtilization >= 75 ? 'Healthy adoption' : 'Below target'}
            statusTone={displayUtilization != null && displayUtilization >= 75 ? 'good' : 'warning'}
          />
          <DashboardStatCard
            label="Total Seats"
            value={displayTotalSeats != null ? formatNumber(displayTotalSeats, 0) : '—'}
            unit="licensed seats"
            helper={selectedProvider ? `${selectedProvider.provider} capacity` : 'Current software capacity'}
            icon={<Users className="h-4 w-4" />}
            statusLabel={activeShare != null ? `${formatPercent(activeShare, 0)} active` : 'Awaiting seat data'}
          />
          <DashboardStatCard
            label="Dormant Seats"
            value={displayDormantSeats != null ? formatNumber(displayDormantSeats, 0) : '—'}
            unit="inactive in period"
            helper={selectedProvider ? `${selectedProvider.provider} unused seats` : 'Unused or underused seats'}
            icon={<AlertTriangle className="h-4 w-4" />}
            statusLabel={dormantShare != null ? `${formatPercent(dormantShare, 0)} dormant share` : 'Awaiting seat data'}
            statusTone={dormantShare != null && dormantShare > 20 ? 'warning' : 'good'}
          />
          <DashboardStatCard
            label="Annual Savings"
            value={displaySavings != null ? formatCurrency(displaySavings, true) : '—'}
            unit="modeled savings"
            helper={selectedProvider ? `${selectedProvider.provider} renewal savings` : 'Potential renewal savings'}
            icon={<DollarSign className="h-4 w-4" />}
            statusLabel={savingsRate != null ? `${formatPercent(savingsRate, 0)} savings rate` : 'Not modeled for all providers'}
            statusTone={savingsRate != null && savingsRate > 10 ? 'good' : 'neutral'}
          />
        </DashboardStatGrid>
        </AnimatedSection>

        {!license || (license.totalLicensedSeats === 0 && computedTotalSeats === 0) ? (
          <DashboardEmptyState
            title="No license data available yet"
            message="Connect Microsoft 365 or Google Workspace to see seat utilization, renewal timing, and optimization opportunities."
          />
        ) : (
          <AnimatedSection animKey={providerFilter}>
          <>
            <div className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
              <DashboardPanel
                title="Portfolio health"
                subtitle="Quick read on active adoption, seat slack, and where the biggest pockets of waste live."
                badge={<DashboardBadge tone={dormantShare != null && dormantShare > 20 ? 'amber' : 'green'}>{largestWasteProvider ? `${largestWasteProvider.provider} has the most dormant seats` : 'Balanced portfolio'}</DashboardBadge>}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <DashboardMiniStat
                    label="Active seats"
                    value={displayActiveSeats != null ? formatNumber(displayActiveSeats, 0) : '—'}
                    hint="Seats with recent usage."
                    tone="good"
                  />
                  <DashboardMiniStat
                    label="Dormant share"
                    value={dormantShare != null ? formatPercent(dormantShare, 0) : '—'}
                    hint="Share of paid capacity with no recent activity."
                    tone={dormantShare != null && dormantShare > 20 ? 'warning' : 'default'}
                  />
                  <DashboardMiniStat
                    label="Soonest renewal"
                    value={filteredRenewalAlerts[0] ? `${filteredRenewalAlerts[0].monthsToRenewal} mo` : '—'}
                    hint={filteredRenewalAlerts[0]?.provider ?? 'No renewal alerts tracked'}
                  />
                  <DashboardMiniStat
                    label="Modeled spend"
                    value={displayAnnualCost != null ? formatCurrency(displayAnnualCost, true) : '—'}
                    hint="Estimated annual cost across providers with pricing coverage."
                  />
                </div>

                <div className="mt-4 space-y-3">
                  {filteredProviders.map((provider) => (
                    <DashboardBarRow
                      key={provider.provider}
                      label={provider.provider}
                      value={formatPercent(provider.utilizationRate, 0)}
                      percentage={provider.utilizationRate}
                      tone={provider.utilizationRate < 75 ? 'amber' : 'green'}
                      hint={`${provider.activeSeats}/${provider.totalSeats} active seats · ${provider.dormantSeats} dormant`}
                    />
                  ))}
                </div>
              </DashboardPanel>

              <DashboardPanel
                title="Savings waterfall"
                subtitle="Modeled annual spend, recoverable savings, and the optimized-state budget if rightsizing is executed."
                badge={<DashboardMetaPill>{optimizedSpend != null ? `${formatCurrency(optimizedSpend, true)} optimized spend` : 'Partial cost coverage'}</DashboardMetaPill>}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <DashboardMiniStat
                    label="Current annual spend"
                    value={formatCurrency(displayAnnualCost)}
                    hint="Based on providers where estimated pricing is modeled."
                  />
                  <DashboardMiniStat
                    label="Savings at renewal"
                    value={formatCurrency(displaySavings)}
                    hint="Modeled recapture from right-sizing seats."
                    tone="good"
                  />
                  <DashboardMiniStat
                    label="Optimized spend"
                    value={formatCurrency(optimizedSpend)}
                    hint="Projected spend after capturing modeled savings."
                    tone="good"
                  />
                  <DashboardMiniStat
                    label="Savings rate"
                    value={savingsRate != null ? formatPercent(savingsRate, 0) : '—'}
                    hint="Share of spend that appears recoverable."
                    tone={savingsRate != null && savingsRate > 10 ? 'good' : 'default'}
                  />
                </div>

                {displayAnnualCost != null && (
                  <div className="mt-4 space-y-3">
                    <DashboardBarRow
                      label="Current spend"
                      value={formatCurrency(displayAnnualCost)}
                      percentage={100}
                      tone="slate"
                      hint="Current modeled annual cost."
                    />
                    {optimizedSpend != null && (
                      <DashboardBarRow
                        label="Optimized spend"
                        value={formatCurrency(optimizedSpend)}
                        percentage={displayAnnualCost > 0 ? (optimizedSpend / displayAnnualCost) * 100 : 0}
                        tone="green"
                        hint="Expected post-rightsizing spend."
                      />
                    )}
                  </div>
                )}
              </DashboardPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <DashboardPanel
                title="Provider detail board"
                subtitle="Provider-level utilization, seat mix, and direct recommendations from the current report."
                badge={<DashboardMetaPill>{filteredProviders.length} providers</DashboardMetaPill>}
              >
                <div className="space-y-3">
                  {filteredProviders.map((provider) => (
                    <div key={provider.provider} className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-[#152820]">{provider.provider}</p>
                          <p className="mt-1 text-sm leading-6 text-[#2e4a40]">{provider.recommendation}</p>
                        </div>
                        <DashboardBadge tone={provider.utilizationRate < 75 ? 'amber' : 'green'}>
                          {formatPercent(provider.utilizationRate, 0)}
                        </DashboardBadge>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <DashboardMiniStat
                          label="Seats"
                          value={`${provider.activeSeats}/${provider.totalSeats}`}
                          hint={`${provider.dormantSeats} dormant`}
                        />
                        <DashboardMiniStat
                          label="Annual cost"
                          value={formatCurrency(provider.estimatedAnnualCost)}
                          hint="Modeled provider spend."
                        />
                        <DashboardMiniStat
                          label="Renewal savings"
                          value={formatCurrency(provider.potentialSavingsAtRenewal)}
                          hint="Potential savings at next renewal."
                          tone="good"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardPanel>

              <DashboardPanel
                title="Renewal radar"
                subtitle="Subscriptions nearing renewal and where action timing matters most."
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
                subtitle="The clearest places to recover value based on dormant seats, low adoption, and provider recommendations."
                badge={<DashboardBadge tone={optimizationActions.length > 0 ? 'amber' : 'green'}>{optimizationActions.length > 0 ? 'Action opportunities surfaced' : 'Portfolio looks stable'}</DashboardBadge>}
              >
                {optimizationActions.length > 0 ? (
                  <div className="space-y-3">
                    {optimizationActions.map((provider) => (
                      <DashboardBarRow
                        key={provider.provider}
                        label={provider.provider}
                        value={`${provider.dormantSeats} dormant`}
                        percentage={provider.totalSeats > 0 ? (provider.dormantSeats / provider.totalSeats) * 100 : 0}
                        tone={provider.dormantSeats > 0 ? 'amber' : 'green'}
                        hint={provider.recommendation}
                      />
                    ))}
                  </div>
                ) : (
                  <DashboardEmptyState
                    title="No immediate optimization actions surfaced"
                    message="GreenLens did not identify low-utilization providers that clearly require intervention this period."
                  />
                )}
              </DashboardPanel>

              <DashboardPanel
                title="License ledger"
                subtitle="Provider-level capacity, cost, and estimated savings in one comparable table."
                badge={<DashboardMetaPill>{filteredProviders.length} providers</DashboardMetaPill>}
              >
                <DashboardTable
                  headers={['Provider', 'Utilization', 'Seat Mix', 'Cost', 'Savings']}
                  rows={filteredProviders.map((provider) => [
                    <span key={`${provider.provider}-name`} className="font-medium text-[#152820]">{provider.provider}</span>,
                    <span key={`${provider.provider}-util`} className="font-medium text-[#152820]">{formatPercent(provider.utilizationRate, 0)}</span>,
                    <span key={`${provider.provider}-seats`} className="text-[#2e4a40]">{provider.activeSeats}/{provider.totalSeats} active · {provider.dormantSeats} dormant</span>,
                    <span key={`${provider.provider}-cost`} className="text-[#2e4a40]">{formatCurrency(provider.estimatedAnnualCost)}</span>,
                    <span key={`${provider.provider}-savings`} className="text-emerald-700">{formatCurrency(provider.potentialSavingsAtRenewal)}</span>,
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
