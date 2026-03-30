import { createClient } from '@/lib/supabase/server'
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
  parseCurrencyString,
} from '@/components/dashboard/DashboardPrimitives'
import IncentiveCard from '@/components/dashboard/IncentiveCard'
import RerunAnalysisButton from '@/components/dashboard/RerunAnalysisButton'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import {
  AlertTriangle,
  BadgeDollarSign,
  FileWarning,
  Globe,
} from 'lucide-react'

interface IncentivesPageProps {
  searchParams?: Promise<{ reportId?: string }>
}

function categorizeIncentive(title: string, description: string, actionRequired?: string) {
  const haystack = `${title} ${description} ${actionRequired ?? ''}`.toLowerCase()
  if (/(compliance|disclosure|regulation|reporting|required|obligation|audit)/.test(haystack)) {
    return 'Regulatory'
  }
  if (/(tax|grant|credit|rebate|incentive|fund|subsid)/.test(haystack)) {
    return 'Financial'
  }
  return 'Strategic'
}

function categorizeUrgency(actionRequired?: string, description?: string) {
  const haystack = `${actionRequired ?? ''} ${description ?? ''}`.toLowerCase()
  if (/(deadline|urgent|required|must|penalt|immediately|renewal)/.test(haystack)) return 'High'
  if (/(apply|prepare|review|submit|track)/.test(haystack)) return 'Medium'
  return 'Watchlist'
}

export default async function IncentivesPage({ searchParams }: IncentivesPageProps) {
  const requestedReportId = (await searchParams)?.reportId ?? null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const report = await getPreferredReport(supabase, company!.id, requestedReportId)
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const incentives: { title: string; description: string; region: string; estimated_value: string; action_required?: string }[] =
    report.incentives_and_benefits?.incentives ?? []
  const note = report.incentives_and_benefits?.note ?? 'Verify current terms with the relevant regulatory body before actioning any incentive.'
  const enrichedIncentives = incentives.map((incentive) => {
    const parsedValue = parseCurrencyString(incentive.estimated_value)
    return {
      ...incentive,
      category: categorizeIncentive(incentive.title, incentive.description, incentive.action_required),
      urgency: categorizeUrgency(incentive.action_required, incentive.description),
      parsedValue,
    }
  })
  const regionSummary = Object.entries(enrichedIncentives.reduce((acc, incentive) => {
    const key = incentive.region || 'Unspecified'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {} as Record<string, number>))
    .map(([region, count]) => ({ region, count, share: incentives.length > 0 ? (count / incentives.length) * 100 : 0 }))
    .sort((a, b) => b.count - a.count)
  const actionRequiredCount = enrichedIncentives.filter((item) => Boolean(item.action_required)).length
  const modeledValue = enrichedIncentives.reduce((sum, incentive) => sum + (incentive.parsedValue ?? 0), 0)
  const modeledValueCount = enrichedIncentives.filter((item) => item.parsedValue != null).length
  const valueCoverage = incentives.length > 0 ? (modeledValueCount / incentives.length) * 100 : 0
  const categoryCounts = enrichedIncentives.reduce((acc, incentive) => {
    acc[incentive.category] = (acc[incentive.category] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const urgencyLanes = ['High', 'Medium', 'Watchlist'].map((lane) => ({
    lane,
    items: enrichedIncentives.filter((item) => item.urgency === lane),
  }))

  return (
    <DashboardPage>
      <div className="space-y-5">
        <DashboardHeader
          title="Financial and regulatory incentives"
          subtitle={`${company!.name} · ${incentives.length} applicable opportunities identified for this reporting profile.`}
          badge={<DashboardMetaPill>{incentives.length > 0 ? `${incentives.length} incentives matched` : 'No current matches'}</DashboardMetaPill>}
          actions={<RerunAnalysisButton initialJobState={analysisJob} />}
        />

        <DashboardFilterBar
          items={[
            { label: 'Page', value: 'Incentives' },
            { label: 'Coverage', value: regionSummary.length > 0 ? `${regionSummary.length} regions` : 'Profile incomplete' },
            { label: 'Focus', value: actionRequiredCount > 0 ? 'Action Required' : 'Opportunity Scan' },
            { label: 'Time Period', value: report.reporting_period },
          ]}
        />

        {incentives.length === 0 ? (
          <DashboardEmptyState
            title="No incentives have been identified yet"
            message="Make sure your industry, regions, and ESG obligations are set correctly in onboarding so GreenLens can match relevant grants, credits, and compliance obligations."
          />
        ) : (
          <>
            <DashboardStatGrid>
              <DashboardStatCard
                label="Opportunities"
                value={formatNumber(incentives.length, 0)}
                unit="matched incentives"
                helper="Combined financial and regulatory items"
                icon={<BadgeDollarSign className="h-4 w-4" />}
                statusLabel={`${formatNumber(categoryCounts.Financial ?? 0, 0)} financial programs`}
              />
              <DashboardStatCard
                label="Regions"
                value={formatNumber(regionSummary.length, 0)}
                unit="regions represented"
                helper="Geographic applicability coverage"
                icon={<Globe className="h-4 w-4" />}
                statusLabel={regionSummary[0] ? `${regionSummary[0].region} has the most opportunities` : 'Regional mapping pending'}
              />
              <DashboardStatCard
                label="Action Required"
                value={formatNumber(actionRequiredCount, 0)}
                unit="follow-up items"
                helper="Items that require next steps"
                icon={<FileWarning className="h-4 w-4" />}
                statusLabel={actionRequiredCount > 0 ? 'Needs owner assignment' : 'No urgent actions'}
                statusTone={actionRequiredCount > 0 ? 'warning' : 'good'}
              />
              <DashboardStatCard
                label="Modeled Value"
                value={modeledValueCount > 0 ? formatCurrency(modeledValue, true) : '—'}
                unit="identified upside"
                helper="Parsed from incentive value fields"
                icon={<AlertTriangle className="h-4 w-4" />}
                statusLabel={`${formatPercent(valueCoverage, 0)} value visibility`}
                statusTone={valueCoverage < 50 ? 'warning' : 'good'}
              />
            </DashboardStatGrid>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <DashboardPanel
                title="Opportunity mix"
                subtitle="Where the current portfolio of matched incentives is concentrated by category and geography."
                badge={<DashboardBadge tone="blue">Portfolio view</DashboardBadge>}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <DashboardMiniStat
                    label="Financial"
                    value={formatNumber(categoryCounts.Financial ?? 0, 0)}
                    hint="Credits, grants, rebates, or direct funding."
                    tone="good"
                  />
                  <DashboardMiniStat
                    label="Regulatory"
                    value={formatNumber(categoryCounts.Regulatory ?? 0, 0)}
                    hint="Disclosure, compliance, or mandated reporting items."
                    tone={categoryCounts.Regulatory ? 'warning' : 'default'}
                  />
                  <DashboardMiniStat
                    label="Strategic"
                    value={formatNumber(categoryCounts.Strategic ?? 0, 0)}
                    hint="Partnerships, certifications, or positioning opportunities."
                  />
                </div>

                <div className="mt-4 space-y-3">
                  {regionSummary.map((region) => (
                    <DashboardBarRow
                      key={region.region}
                      label={region.region}
                      value={`${region.count} opportunities`}
                      percentage={region.share}
                      hint={`${formatPercent(region.share, 0)} of matched portfolio`}
                    />
                  ))}
                </div>
              </DashboardPanel>

              <DashboardPanel
                title="Urgency lanes"
                subtitle="A quick triage board for what to action now versus what to track."
                badge={<DashboardBadge tone={actionRequiredCount > 0 ? 'amber' : 'green'}>{actionRequiredCount > 0 ? 'Follow-up required' : 'Monitoring only'}</DashboardBadge>}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  {urgencyLanes.map((lane) => (
                    <div key={lane.lane} className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-[#152820]">{lane.lane}</p>
                        <DashboardBadge tone={lane.lane === 'High' ? 'amber' : lane.lane === 'Medium' ? 'blue' : 'slate'}>
                          {lane.items.length}
                        </DashboardBadge>
                      </div>
                      <div className="mt-3 space-y-2">
                        {lane.items.slice(0, 3).map((item) => (
                          <div key={`${lane.lane}-${item.title}`} className="rounded-xl bg-white px-3 py-2 text-xs leading-5 text-[#60726b]">
                            {item.title}
                          </div>
                        ))}
                        {lane.items.length === 0 && (
                          <p className="text-xs text-[#9aa7a0]">No items in this lane.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <DashboardPanel
                title="Readiness and compliance"
                subtitle="The system note plus action-required items that should be assigned to owners."
                badge={<DashboardBadge tone="slate">Library guidance</DashboardBadge>}
              >
                <div className="rounded-2xl bg-[#fbfcfb] px-4 py-4 text-sm leading-6 text-[#60726b]">
                  {note}
                </div>
                <div className="mt-4 space-y-3">
                  {enrichedIncentives.filter((item) => item.action_required).map((item) => (
                    <DashboardBarRow
                      key={`${item.title}-action`}
                      label={item.title}
                      value={item.urgency}
                      percentage={item.urgency === 'High' ? 100 : item.urgency === 'Medium' ? 60 : 30}
                      tone={item.urgency === 'High' ? 'amber' : item.urgency === 'Medium' ? 'green' : 'slate'}
                      hint={item.action_required}
                    />
                  ))}
                  {actionRequiredCount === 0 && (
                    <DashboardEmptyState
                      title="No explicit action-required items"
                      message="GreenLens did not attach any action-required follow-up notes to the currently matched incentives."
                    />
                  )}
                </div>
              </DashboardPanel>

              <DashboardPanel
                title="Opportunity ledger"
                subtitle="Normalized view of category, region, and value visibility across every matched incentive."
                badge={<DashboardMetaPill>{modeledValueCount} incentives with modeled value</DashboardMetaPill>}
              >
                <DashboardTable
                  headers={['Title', 'Category', 'Region', 'Value', 'Urgency']}
                  rows={enrichedIncentives.map((item) => [
                    <span key={`${item.title}-title`} className="font-medium text-[#152820]">{item.title}</span>,
                    <DashboardBadge key={`${item.title}-category`} tone={item.category === 'Regulatory' ? 'amber' : item.category === 'Financial' ? 'green' : 'blue'}>
                      {item.category}
                    </DashboardBadge>,
                    <span key={`${item.title}-region`} className="text-[#60726b]">{item.region}</span>,
                    <span key={`${item.title}-value`} className="text-[#60726b]">{item.estimated_value}</span>,
                    <DashboardBadge key={`${item.title}-urgency`} tone={item.urgency === 'High' ? 'amber' : item.urgency === 'Medium' ? 'blue' : 'slate'}>
                      {item.urgency}
                    </DashboardBadge>,
                  ])}
                />
              </DashboardPanel>
            </div>

            <DashboardPanel
              title="Incentive board"
              subtitle="Detailed cards grouped by region so finance, legal, and sustainability teams can review what is relevant to them."
              badge={<DashboardBadge tone="green">Execution-ready list</DashboardBadge>}
            >
              <div className="space-y-6">
                {regionSummary.map((region) => (
                  <div key={region.region}>
                    <div className="mb-3 flex items-center gap-3">
                      <h3 className="font-medium text-[#152820]">{region.region}</h3>
                      <DashboardBadge tone="slate">{region.count}</DashboardBadge>
                    </div>
                    <div className="space-y-3">
                      {enrichedIncentives
                        .filter((item) => item.region === region.region)
                        .map((incentive, index) => (
                          <IncentiveCard key={`${region.region}-${index}`} {...incentive} />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </>
        )}
      </div>
    </DashboardPage>
  )
}
