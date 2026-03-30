import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import {
  DashboardBadge,
  DashboardEmptyState,
  DashboardHeader,
  DashboardMetaPill,
  DashboardMiniStat,
  DashboardPage,
  DashboardPanel,
  DashboardStatCard,
  DashboardStatGrid,
  formatNumber,
  titleize,
} from '@/components/dashboard/DashboardPrimitives'
import RerunAnalysisButton from '@/components/dashboard/RerunAnalysisButton'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import {
  AlertTriangle,
  ClipboardList,
  Gauge,
  Sparkles,
} from 'lucide-react'

interface DecisionDetailProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ reportId?: string }>
}

export default async function DecisionDetailPage({ params, searchParams }: DecisionDetailProps) {
  const { id } = await params
  const requestedReportId = (await searchParams)?.reportId ?? null
  const index = parseInt(id, 10) - 1
  const backHref = requestedReportId
    ? `/dashboard/decisions?reportId=${encodeURIComponent(requestedReportId)}`
    : '/dashboard/decisions'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const report = await getPreferredReport(supabase, company!.id, requestedReportId)
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const decisions = report.strategic_decisions?.decisions
    ?.sort((a: { impactScore: number }, b: { impactScore: number }) => b.impactScore - a.impactScore) ?? []

  const decision = decisions[index] as {
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
  } | undefined
  const relatedDecisionPool: Array<{
    decision: {
      title: string
      impactScore: number
      urgencyTier: string
    }
    position: number
  }> = decisions
    .map((item: unknown, position: number) => ({ decision: item as {
      title: string
      impactScore: number
      urgencyTier: string
    }, position }))
  const relatedDecisions = relatedDecisionPool
    .filter((item) => item.position !== index)
    .slice(0, 2)
  const urgencyTone = decision?.urgencyTier?.toLowerCase() === 'high'
    ? 'amber'
    : decision?.urgencyTier?.toLowerCase() === 'medium'
      ? 'blue'
      : 'slate'

  if (!decision) {
    return (
      <DashboardPage className="max-w-3xl mx-auto">
        <Link href={backHref} className="mb-8 inline-flex rounded-full border border-[#dce9e2] bg-[#f7fbf8] px-3 py-1.5 text-sm text-[#4d8369] transition hover:bg-[#edf6f1]">
          ← Back to decisions
        </Link>
        <DashboardEmptyState title="Decision not found" message="The selected decision brief does not exist for this report." />
      </DashboardPage>
    )
  }

  return (
    <DashboardPage className="max-w-5xl mx-auto">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Link href={backHref} className="inline-flex rounded-full border border-[#dce9e2] bg-[#f7fbf8] px-3 py-1.5 text-sm text-[#4d8369] transition hover:bg-[#edf6f1]">
            ← Back to decisions
          </Link>
          <RerunAnalysisButton initialJobState={analysisJob} />
        </div>

        <DashboardHeader
          title={decision.title}
          subtitle={`${company!.name} · Decision #${id}. Detailed brief, execution steps, and risk framing for this recommendation.`}
          badge={<DashboardMetaPill>{report.reporting_period}</DashboardMetaPill>}
        />

        <DashboardStatGrid>
          <DashboardStatCard
            label="Impact Score"
            value={formatNumber(decision.impactScore, 0)}
            unit="/10 priority score"
            helper="Relative strategic importance"
            icon={<Gauge className="h-4 w-4" />}
            statusLabel="Weighted impact"
          />
          <DashboardStatCard
            label="Urgency"
            value={titleize(decision.urgencyTier)}
            unit="execution cadence"
            helper="How quickly this likely needs attention"
            icon={<AlertTriangle className="h-4 w-4" />}
            statusLabel={decision.urgencyTier}
            statusTone={decision.urgencyTier?.toLowerCase() === 'high' ? 'warning' : 'good'}
          />
          <DashboardStatCard
            label="Effort"
            value={decision.effort ?? '—'}
            unit="delivery effort"
            helper="Indicative implementation complexity"
            icon={<Sparkles className="h-4 w-4" />}
            statusLabel={decision.timeframe ?? 'Timeframe pending'}
          />
          <DashboardStatCard
            label="Action Steps"
            value={formatNumber(decision.actionSteps?.length ?? 0, 0)}
            unit="named steps"
            helper="Concrete execution checklist"
            icon={<ClipboardList className="h-4 w-4" />}
            statusLabel={(decision.actionSteps?.length ?? 0) > 0 ? 'Ready to action' : 'Needs fuller plan'}
            statusTone={(decision.actionSteps?.length ?? 0) > 0 ? 'good' : 'warning'}
          />
        </DashboardStatGrid>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <DashboardPanel
            title="Decision brief"
            subtitle="The core operating situation that makes this recommendation relevant right now."
            badge={<DashboardBadge tone={urgencyTone as 'green' | 'amber' | 'blue' | 'red' | 'slate'}>{decision.urgencyTier}</DashboardBadge>}
          >
            <p className="text-sm leading-7 text-[#60726b]">{decision.situation}</p>
          </DashboardPanel>

          <DashboardPanel
            title="Impact profile"
            subtitle="How this recommendation is expected to matter across sustainability, cost, and resource efficiency."
            badge={<DashboardMetaPill>{decision.timeframe ?? 'Timeframe not specified'}</DashboardMetaPill>}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <DashboardMiniStat
                label="Carbon"
                value={decision.carbonImpact ?? '—'}
                hint="Expected sustainability outcome."
                tone="good"
              />
              <DashboardMiniStat
                label="Financial"
                value={decision.financialImpact ?? '—'}
                hint="Expected cost or savings implication."
                tone="good"
              />
              <DashboardMiniStat
                label="Water"
                value={decision.waterImpact ?? '—'}
                hint="Expected resource implication."
              />
            </div>
          </DashboardPanel>
        </div>

        {(decision.effort || decision.timeframe) && (
          <DashboardPanel
            title="Delivery framing"
            subtitle="How difficult the work is likely to be and when teams should expect to realize impact."
            badge={<DashboardBadge tone="slate">Implementation lens</DashboardBadge>}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <DashboardMiniStat
                label="Effort"
                value={decision.effort ?? '—'}
                hint="Indicative delivery complexity."
              />
              <DashboardMiniStat
                label="Timeframe"
                value={decision.timeframe ?? '—'}
                hint="Expected realization horizon."
              />
            </div>
          </DashboardPanel>
        )}

        {decision.actionSteps?.length ? (
          <DashboardPanel
            title="Action plan"
            subtitle="Recommended next steps to move this decision from recommendation to execution."
            badge={<DashboardBadge tone="green">Execution checklist</DashboardBadge>}
          >
            <ol className="space-y-3">
              {decision.actionSteps.map((step: string, stepIndex: number) => (
                <li key={stepIndex} className="flex gap-3 rounded-2xl bg-[#fbfcfb] px-4 py-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#edf6f1] text-sm font-semibold text-[#2e6a54]">
                    {stepIndex + 1}
                  </span>
                  <span className="text-sm leading-6 text-[#60726b]">{step}</span>
                </li>
              ))}
            </ol>
          </DashboardPanel>
        ) : (
          <DashboardEmptyState
            title="No explicit action steps were provided"
            message="This decision has strategic framing, but GreenLens did not generate a step-by-step execution checklist for it."
          />
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          {decision.risk ? (
            <DashboardPanel
              title="Risk and governance"
              subtitle="Primary risk considerations to account for if this recommendation is pursued."
              badge={<DashboardBadge tone="amber">Risk note</DashboardBadge>}
            >
              <p className="text-sm leading-7 text-[#60726b]">{decision.risk}</p>
            </DashboardPanel>
          ) : (
            <DashboardEmptyState
              title="No specific risk note was provided"
              message="Risk framing was not included for this decision in the current report payload."
            />
          )}

          <DashboardPanel
            title="Related decisions"
            subtitle="Other high-priority briefs from the same report that leadership may want to review alongside this one."
            badge={<DashboardBadge tone="blue">Context set</DashboardBadge>}
          >
            {relatedDecisions.length > 0 ? (
              <div className="space-y-3">
                {relatedDecisions.map((related) => {
                  const href = requestedReportId
                    ? `/dashboard/decisions/${related.position + 1}?reportId=${encodeURIComponent(requestedReportId)}`
                    : `/dashboard/decisions/${related.position + 1}`
                  return (
                    <Link key={related.decision.title} href={href} className="block rounded-2xl bg-[#fbfcfb] px-4 py-4 transition hover:bg-[#f4f9f6]">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-[#152820]">{related.decision.title}</p>
                          <p className="mt-1 text-sm text-[#60726b]">{related.decision.impactScore}/10 impact · {related.decision.urgencyTier} urgency</p>
                        </div>
                        <DashboardBadge tone="slate">Open brief</DashboardBadge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <DashboardEmptyState
                title="No related decisions available"
                message="This is the only decision currently ranked in the report."
              />
            )}
          </DashboardPanel>
        </div>
      </div>
    </DashboardPage>
  )
}
