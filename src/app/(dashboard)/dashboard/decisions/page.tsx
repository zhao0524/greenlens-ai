import { createClient } from '@/lib/supabase/server'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import {
  DashboardBadge,
  DashboardEmptyState,
  DashboardFilterBar,
  DashboardHeader,
  DashboardMetaPill,
  DashboardMiniStat,
  DashboardPage,
  DashboardPanel,
  DashboardStatCard,
  DashboardStatGrid,
  formatNumber,
} from '@/components/dashboard/DashboardPrimitives'
import DecisionCard from '@/components/dashboard/DecisionCard'
import RerunAnalysisButton from '@/components/dashboard/RerunAnalysisButton'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import {
  AlertTriangle,
  ClipboardList,
  Gauge,
  Sparkles,
} from 'lucide-react'

interface DecisionsPageProps {
  searchParams?: Promise<{ reportId?: string }>
}

export default async function DecisionsPage({ searchParams }: DecisionsPageProps) {
  const requestedReportId = (await searchParams)?.reportId ?? null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const report = await getPreferredReport(supabase, company!.id, requestedReportId)
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const decisions: {
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

  return (
    <DashboardPage>
      <div className="space-y-5">
        <DashboardHeader
          title="Strategic decisions"
          subtitle={`${company!.name} · ${decisions.length} recommendation${decisions.length !== 1 ? 's' : ''} generated for this quarter.`}
          badge={<DashboardMetaPill>{decisions.length > 0 ? `${decisions.length} decisions prioritized` : 'No decisions yet'}</DashboardMetaPill>}
          actions={<RerunAnalysisButton initialJobState={analysisJob} />}
        />

        <DashboardFilterBar
          items={[
            { label: 'Page', value: 'Decisions' },
            { label: 'Priority', value: highUrgencyCount > 0 ? 'High urgency present' : 'Balanced backlog' },
            { label: 'Execution Mode', value: quickWinCount > 0 ? 'Quick wins available' : 'Longer horizon' },
            { label: 'Time Period', value: report.reporting_period },
          ]}
        />

        {decisions.length === 0 ? (
          <DashboardEmptyState
            title="No strategic decisions generated yet"
            message="GreenLens will populate this page once analysis has enough evidence to recommend concrete operational or financial moves."
          />
        ) : (
          <>
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

            {executiveNarrative && (
              <DashboardPanel
                title="Decision narrative"
                subtitle="Executive framing for why these recommendations matter together, not just individually."
                badge={<DashboardBadge tone="blue">Leadership brief</DashboardBadge>}
              >
                <p className="text-sm leading-7 text-[#60726b]">{executiveNarrative}</p>
              </DashboardPanel>
            )}

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
                  {urgencyLanes.map((lane) => (
                    <div key={lane.lane} className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-[#152820]">{lane.label}</p>
                        <DashboardBadge tone={lane.lane === 'high' ? 'amber' : lane.lane === 'medium' ? 'blue' : 'slate'}>
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
                          <p className="text-xs text-[#9aa7a0]">No decisions in this lane.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardPanel>
            </div>

            <DashboardPanel
              title="Decision queue"
              subtitle="Open each brief for the full execution plan, impact framing, and risk notes."
              badge={<DashboardBadge tone="green">Execution-ready backlog</DashboardBadge>}
            >
              <div className="space-y-4">
                {decisions.map((decision, index) => (
                  <DecisionCard
                    key={index}
                    decision={decision}
                    index={index + 1}
                    href={`${decisionHrefBase.replace('/decisions', `/decisions/${index + 1}`)}`}
                  />
                ))}
              </div>
            </DashboardPanel>
          </>
        )}
      </div>
    </DashboardPage>
  )
}
