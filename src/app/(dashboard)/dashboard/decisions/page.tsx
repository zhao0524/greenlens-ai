import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import {
  cx,
  DashboardBadge,
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
  formatNumber,
} from '@/components/dashboard/DashboardPrimitives'
import { DashboardFilterSelect } from '@/components/dashboard/DashboardFilterSelect'
import DecisionCard from '@/components/dashboard/DecisionCard'
import RerunAnalysisButton from '@/components/dashboard/RerunAnalysisButton'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import { getCompanyReports } from '@/lib/reports/get-company-reports'
import {
  AlertTriangle,
  ClipboardList,
  Gauge,
  Sparkles,
} from 'lucide-react'

const PRIORITY_OPTIONS = [
  { label: 'All Priorities', value: 'all' },
  { label: 'High urgency', value: 'high' },
  { label: 'Medium urgency', value: 'medium' },
  { label: 'Low urgency', value: 'low' },
]

interface DecisionsPageProps {
  searchParams?: Promise<{ reportId?: string; priority?: string }>
}

export default async function DecisionsPage({ searchParams }: DecisionsPageProps) {
  const params = await searchParams
  const requestedReportId = params?.reportId ?? null
  const priorityFilter = params?.priority ?? 'all'
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

  const allDecisions: {
    title: string
    situation: string
    impactScore: number
    urgencyTier: string
    carbonImpact?: string
    financialImpact?: string
    waterImpact?: string
    effort?: string
    timeframe?: string
    actionSteps?: string[]
    risk?: string
  }[] =
    report.strategic_decisions?.decisions
      ?.sort((a: { impactScore: number }, b: { impactScore: number }) => b.impactScore - a.impactScore) ?? []

  const decisions = priorityFilter === 'all'
    ? allDecisions
    : allDecisions.filter((d) => d.urgencyTier?.toLowerCase() === priorityFilter)
  const executiveNarrative = report.strategic_decisions?.executive_narrative ?? report.executive_summary?.narrative ?? null
  const averageImpact = decisions.length > 0
    ? decisions.reduce((sum, decision) => sum + decision.impactScore, 0) / decisions.length
    : null
  const highUrgencyCount = decisions.filter((decision) => decision.urgencyTier?.toLowerCase() === 'high').length
  const quickWinCount = decisions.filter((decision) => /low|short|immediate|quick/i.test(`${decision.effort ?? ''} ${decision.timeframe ?? ''}`)).length
  const impactCoverage = {
    carbon: decisions.filter((decision) => Boolean(decision.carbonImpact)).length,
    financial: decisions.filter((decision) => Boolean(decision.financialImpact)).length,
    water: decisions.filter((decision) => Boolean(decision.waterImpact)).length,
    actionSteps: decisions.filter((decision) => (decision.actionSteps?.length ?? 0) > 0).length,
  }
  const urgencyLanes = ['high', 'medium', 'low'].map((lane) => ({
    lane,
    label: lane[0].toUpperCase() + lane.slice(1),
    items: decisions.filter((decision) => decision.urgencyTier?.toLowerCase() === lane),
  }))
  const decisionHrefBase = requestedReportId
    ? `/dashboard/decisions?reportId=${encodeURIComponent(requestedReportId)}`
    : '/dashboard/decisions'

  const laneStyles = {
    high: { bg: 'bg-amber-50', border: 'border-l-2 border-amber-400', dot: 'bg-amber-400', label: 'text-amber-800' },
    medium: { bg: 'bg-blue-50', border: 'border-l-2 border-blue-400', dot: 'bg-blue-400', label: 'text-blue-800' },
    low: { bg: 'bg-[#f7fbf8]', border: 'border-l-2 border-[#8fa098]', dot: 'bg-[#8fa098]', label: 'text-[#4d6b5e]' },
  } as const

  return (
    <DashboardPage>
      <div className="space-y-5">
        <DashboardHeader
          title="Strategic decisions"
          subtitle={`${company!.name} · ${decisions.length} recommendation${decisions.length !== 1 ? 's' : ''} generated for this quarter.`}
          badge={<DashboardMetaPill>{decisions.length > 0 ? `${decisions.length} decisions prioritized` : 'No decisions yet'}</DashboardMetaPill>}
          actions={<RerunAnalysisButton initialJobState={analysisJob} />}
        />

        <Suspense>
          <DashboardFilterBar>
            <DashboardFilterSelect
              label="Priority"
              paramKey="priority"
              value={priorityFilter}
              options={PRIORITY_OPTIONS}
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
            <DashboardFilterPill label="Quick wins" value={quickWinCount > 0 ? `${quickWinCount} available` : 'None flagged'} />
          </DashboardFilterBar>
        </Suspense>

        {decisions.length === 0 ? (
          <DashboardEmptyState
            title="No strategic decisions generated yet"
            message="GreenLens will populate this page once analysis has enough evidence to recommend concrete operational or financial moves."
          />
        ) : (
          <>
            <div className="fade-in-up stagger-1">
              <DashboardStatGrid>
                <DashboardStatCard
                  label="Recommendations"
                  value={formatNumber(decisions.length, 0)}
                  unit="decision briefs"
                  helper="Total decision opportunities"
                  icon={<ClipboardList className="h-4 w-4" />}
                  statusLabel={decisions[0] ? `${decisions[0].title} is currently top-ranked` : 'Awaiting prioritization'}
                />
                <DashboardStatCard
                  label="Average Impact"
                  value={averageImpact != null ? formatNumber(averageImpact, 1) : '—'}
                  unit="/10 score"
                  helper="Mean decision impact"
                  icon={<Gauge className="h-4 w-4" />}
                  statusLabel={averageImpact != null && averageImpact >= 7 ? 'Strong portfolio of actions' : 'Mixed impact set'}
                  statusTone={averageImpact != null && averageImpact >= 7 ? 'good' : 'warning'}
                />
                <DashboardStatCard
                  label="High Urgency"
                  value={formatNumber(highUrgencyCount, 0)}
                  unit="priority items"
                  helper="Decisions that likely need near-term action"
                  icon={<AlertTriangle className="h-4 w-4" />}
                  statusLabel={highUrgencyCount > 0 ? 'Escalate ownership' : 'No escalations flagged'}
                  statusTone={highUrgencyCount > 0 ? 'warning' : 'good'}
                />
                <DashboardStatCard
                  label="Quick Wins"
                  value={formatNumber(quickWinCount, 0)}
                  unit="faster actions"
                  helper="Decisions with short effort or timeframe cues"
                  icon={<Sparkles className="h-4 w-4" />}
                  statusLabel={quickWinCount > 0 ? 'Good near-term momentum' : 'Mostly structural work'}
                />
              </DashboardStatGrid>
            </div>

            {executiveNarrative && (
              <div className="fade-in-up stagger-2">
                <DashboardPanel
                  title="Decision narrative"
                  subtitle="Executive framing for why these recommendations matter together, not just individually."
                  badge={<DashboardBadge tone="blue">Leadership brief</DashboardBadge>}
                >
                  <div className="flex gap-4">
                    <div className="w-[3px] shrink-0 self-stretch rounded-full bg-[#38b76a]/40" />
                    <p className="text-sm leading-7 text-[#2e4a40]">{executiveNarrative}</p>
                  </div>
                </DashboardPanel>
              </div>
            )}

            <div className="fade-in-up stagger-3">
              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <DashboardPanel
                  title="Impact coverage"
                  subtitle="What kinds of outcomes the current decision backlog speaks to most clearly."
                  badge={<DashboardMetaPill>{impactCoverage.actionSteps} decisions with action plans</DashboardMetaPill>}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <DashboardMiniStat
                      label="Carbon-linked"
                      value={formatNumber(impactCoverage.carbon, 0)}
                      hint="Decisions with explicit carbon impact framing."
                      tone="good"
                    />
                    <DashboardMiniStat
                      label="Financial-linked"
                      value={formatNumber(impactCoverage.financial, 0)}
                      hint="Decisions with direct spend or savings implications."
                      tone="good"
                    />
                    <DashboardMiniStat
                      label="Water-linked"
                      value={formatNumber(impactCoverage.water, 0)}
                      hint="Decisions that include water impact framing."
                    />
                    <DashboardMiniStat
                      label="Action plans"
                      value={formatNumber(impactCoverage.actionSteps, 0)}
                      hint="Decisions with named next steps."
                      tone={impactCoverage.actionSteps > 0 ? 'good' : 'default'}
                    />
                  </div>
                </DashboardPanel>

                <DashboardPanel
                  title="Priority lanes"
                  subtitle="The backlog arranged by urgency so teams know what to escalate first."
                  badge={<DashboardBadge tone={highUrgencyCount > 0 ? 'amber' : 'green'}>{highUrgencyCount > 0 ? 'Escalations present' : 'No urgent items'}</DashboardBadge>}
                >
                  <div className="grid gap-3 md:grid-cols-3">
                    {urgencyLanes.map((lane) => {
                      const style = laneStyles[lane.lane as keyof typeof laneStyles] ?? laneStyles.low
                      return (
                        <div key={lane.lane} className={cx('rounded-2xl px-4 py-4', style.bg, style.border)}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className={cx('h-2 w-2 shrink-0 rounded-full', style.dot)} />
                              <p className={cx('text-sm font-semibold', style.label)}>{lane.label}</p>
                            </div>
                            <DashboardBadge tone={lane.lane === 'high' ? 'amber' : lane.lane === 'medium' ? 'blue' : 'slate'}>
                              {lane.items.length}
                            </DashboardBadge>
                          </div>
                          <div className="mt-3 space-y-2">
                            {lane.items.slice(0, 3).map((item) => (
                              <div key={`${lane.lane}-${item.title}`} className="rounded-xl bg-white px-3 py-2 text-sm leading-5 text-[#2e4a40] shadow-[0_1px_4px_rgba(16,38,29,0.05)]">
                                {item.title}
                              </div>
                            ))}
                            {lane.items.length === 0 && (
                              <p className="text-xs font-medium text-[#4a5e56]">No decisions in this lane.</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </DashboardPanel>
              </div>
            </div>

            <div className="fade-in-up stagger-4">
              <DashboardPanel
                title="Decision queue"
                subtitle="Open each brief for the full execution plan, impact framing, and risk notes."
                badge={<DashboardBadge tone="green">Execution-ready backlog</DashboardBadge>}
              >
                <div className="space-y-4">
                  {decisions.map((decision, index) => (
                    <div key={index} className={cx('fade-in-up', `stagger-${Math.min(index + 1, 5)}`)}>
                      <DecisionCard
                        decision={decision}
                        index={index + 1}
                        href={`${decisionHrefBase.replace('/decisions', `/decisions/${index + 1}`)}`}
                      />
                    </div>
                  ))}
                </div>
              </DashboardPanel>
            </div>
          </>
        )}
      </div>
    </DashboardPage>
  )
}
