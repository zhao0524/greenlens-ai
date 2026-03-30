import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import {
  DashboardBadge,
  DashboardBarRow,
  DashboardEmptyState,
  DashboardFilterBar,
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
import RerunAnalysisButton from '@/components/dashboard/RerunAnalysisButton'
import SectionAvailabilityNotice from '@/components/dashboard/SectionAvailabilityNotice'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import { getSectionAvailability } from '@/lib/reports/report-availability'
import {
  AlertTriangle,
  DollarSign,
  Gauge,
  Users,
} from 'lucide-react'

interface LicensesPageProps {
  searchParams?: Promise<{ reportId?: string }>
}

export default async function LicensesPage({ searchParams }: LicensesPageProps) {
  const requestedReportId = (await searchParams)?.reportId ?? null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const report = await getPreferredReport(supabase, company!.id, requestedReportId)
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
  const overallRate = license?.overallUtilizationRate ?? report.license_utilization_rate ?? null
  const dormantShare = license?.totalLicensedSeats
    ? (license.totalDormantSeats / license.totalLicensedSeats) * 100
    : null
  const activeShare = license?.totalLicensedSeats
    ? (license.totalActiveSeats / license.totalLicensedSeats) * 100
    : null
  const optimizedSpend = license?.estimatedAnnualLicenseCost != null && license?.potentialAnnualSavings != null
    ? Math.max(0, license.estimatedAnnualLicenseCost - license.potentialAnnualSavings)
    : null
  const savingsRate = license?.estimatedAnnualLicenseCost != null && license?.potentialAnnualSavings != null && license.estimatedAnnualLicenseCost > 0
    ? (license.potentialAnnualSavings / license.estimatedAnnualLicenseCost) * 100
    : null
  const largestWasteProvider = [...providers].sort((a, b) => b.dormantSeats - a.dormantSeats)[0] ?? null
  const urgentRenewals = (license?.renewalAlerts ?? []).filter((item) => item.monthsToRenewal <= 3)
  const optimizationActions = providers
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

        <DashboardFilterBar
          items={[
            { label: 'Page', value: 'Licenses' },
            { label: 'Portfolio', value: providers.length > 0 ? `${providers.length} connected providers` : 'No provider data' },
            { label: 'Primary Risk', value: urgentRenewals.length > 0 ? 'Renewal Pressure' : 'Utilization Review' },
            { label: 'Time Period', value: report.reporting_period },
          ]}
        />

        {!licenseAvailable && (
          <SectionAvailabilityNotice
            title="License analysis unavailable"
            message={sectionAvailability.license.message ?? 'Connect Microsoft 365 or Google Workspace and rerun analysis to populate this section.'}
          />
        )}

        <DashboardStatGrid>
          <DashboardStatCard
            label="Utilization"
            value={overallRate != null ? formatNumber(overallRate, 0) : '—'}
            unit="% active seats"
            helper="Overall license engagement"
            icon={<Gauge className="h-4 w-4" />}
            statusLabel={overallRate != null && overallRate >= 75 ? 'Healthy adoption' : 'Below target'}
            statusTone={overallRate != null && overallRate >= 75 ? 'good' : 'warning'}
          />
          <DashboardStatCard
            label="Total Seats"
            value={license?.totalLicensedSeats != null ? formatNumber(license.totalLicensedSeats, 0) : '—'}
            unit="licensed seats"
            helper="Current software capacity"
            icon={<Users className="h-4 w-4" />}
            statusLabel={activeShare != null ? `${formatPercent(activeShare, 0)} active` : 'Awaiting seat data'}
          />
          <DashboardStatCard
            label="Dormant Seats"
            value={license?.totalDormantSeats != null ? formatNumber(license.totalDormantSeats, 0) : '—'}
            unit="inactive in period"
            helper="Unused or underused seats"
            icon={<AlertTriangle className="h-4 w-4" />}
            statusLabel={dormantShare != null ? `${formatPercent(dormantShare, 0)} dormant share` : 'Awaiting seat data'}
            statusTone={dormantShare != null && dormantShare > 20 ? 'warning' : 'good'}
          />
          <DashboardStatCard
            label="Annual Savings"
            value={license?.potentialAnnualSavings != null ? formatCurrency(license.potentialAnnualSavings, true) : '—'}
            unit="modeled savings"
            helper="Potential renewal savings"
            icon={<DollarSign className="h-4 w-4" />}
            statusLabel={savingsRate != null ? `${formatPercent(savingsRate, 0)} savings rate` : 'Not modeled for all providers'}
            statusTone={savingsRate != null && savingsRate > 10 ? 'good' : 'neutral'}
          />
        </DashboardStatGrid>

        {!license || license.totalLicensedSeats === 0 ? (
          <DashboardEmptyState
            title="No license data available yet"
            message="Connect Microsoft 365 or Google Workspace to see seat utilization, renewal timing, and optimization opportunities."
          />
        ) : (
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
                    value={formatNumber(license.totalActiveSeats, 0)}
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
                    value={license.renewalAlerts?.[0] ? `${license.renewalAlerts[0].monthsToRenewal} mo` : '—'}
                    hint={license.renewalAlerts?.[0]?.provider ?? 'No renewal alerts tracked'}
                  />
                  <DashboardMiniStat
                    label="Modeled spend"
                    value={license.estimatedAnnualLicenseCost != null ? formatCurrency(license.estimatedAnnualLicenseCost, true) : '—'}
                    hint="Estimated annual cost across providers with pricing coverage."
                  />
                </div>

                <div className="mt-4 space-y-3">
                  {providers.map((provider) => (
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
                    value={formatCurrency(license.estimatedAnnualLicenseCost)}
                    hint="Based on providers where estimated pricing is modeled."
                  />
                  <DashboardMiniStat
                    label="Savings at renewal"
                    value={formatCurrency(license.potentialAnnualSavings)}
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

                {license.estimatedAnnualLicenseCost != null && optimizedSpend != null && (
                  <div className="mt-4 space-y-3">
                    <DashboardBarRow
                      label="Current spend"
                      value={formatCurrency(license.estimatedAnnualLicenseCost)}
                      percentage={100}
                      tone="slate"
                      hint="Current modeled annual cost."
                    />
                    <DashboardBarRow
                      label="Optimized spend"
                      value={formatCurrency(optimizedSpend)}
                      percentage={license.estimatedAnnualLicenseCost > 0 ? (optimizedSpend / license.estimatedAnnualLicenseCost) * 100 : 0}
                      tone="green"
                      hint="Expected post-rightsizing spend."
                    />
                  </div>
                )}
              </DashboardPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <DashboardPanel
                title="Provider detail board"
                subtitle="Provider-level utilization, seat mix, and direct recommendations from the current report."
                badge={<DashboardMetaPill>{providers.length} providers</DashboardMetaPill>}
              >
                <div className="space-y-3">
                  {providers.map((provider) => (
                    <div key={provider.provider} className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-[#152820]">{provider.provider}</p>
                          <p className="mt-1 text-sm leading-6 text-[#60726b]">{provider.recommendation}</p>
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
                {license.renewalAlerts && license.renewalAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {license.renewalAlerts.map((alert, index) => (
                      <div key={`${alert.provider}-${index}`} className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-[#152820]">{alert.provider}</p>
                            <p className="mt-1 text-sm leading-6 text-[#60726b]">{alert.actionRequired}</p>
                          </div>
                          <DashboardBadge tone={alert.monthsToRenewal <= 3 ? 'amber' : 'slate'}>
                            {alert.monthsToRenewal} months
                          </DashboardBadge>
                        </div>
                        <p className="mt-3 text-xs text-[#7f8f88]">Renewal date: {alert.renewalDate}</p>
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
                badge={<DashboardMetaPill>{providers.length} providers</DashboardMetaPill>}
              >
                <DashboardTable
                  headers={['Provider', 'Utilization', 'Seat Mix', 'Cost', 'Savings']}
                  rows={providers.map((provider) => [
                    <span key={`${provider.provider}-name`} className="font-medium text-[#152820]">{provider.provider}</span>,
                    <span key={`${provider.provider}-util`} className="font-medium text-[#152820]">{formatPercent(provider.utilizationRate, 0)}</span>,
                    <span key={`${provider.provider}-seats`} className="text-[#60726b]">{provider.activeSeats}/{provider.totalSeats} active · {provider.dormantSeats} dormant</span>,
                    <span key={`${provider.provider}-cost`} className="text-[#60726b]">{formatCurrency(provider.estimatedAnnualCost)}</span>,
                    <span key={`${provider.provider}-savings`} className="text-emerald-700">{formatCurrency(provider.potentialSavingsAtRenewal)}</span>,
                  ])}
                />
              </DashboardPanel>
            </div>
          </>
        )}
      </div>
    </DashboardPage>
  )
}
