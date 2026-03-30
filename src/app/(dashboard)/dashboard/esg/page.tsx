import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import {
  DashboardBadge,
  DashboardFilterBar,
  DashboardHeader,
  DashboardMetaPill,
  DashboardMiniStat,
  DashboardPage,
  DashboardPanel,
  DashboardStatCard,
  DashboardStatGrid,
  formatCompactNumber,
  formatNumber,
} from '@/components/dashboard/DashboardPrimitives'
import DownloadPDFButton from '@/components/dashboard/ESGExport'
import RerunAnalysisButton from '@/components/dashboard/RerunAnalysisButton'
import SectionAvailabilityNotice from '@/components/dashboard/SectionAvailabilityNotice'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import { getSectionAvailability } from '@/lib/reports/report-availability'
import {
  Bot,
  Droplets,
  FileText,
  Leaf,
  ShieldCheck,
  TrendingDown,
  Trophy,
  Globe2,
} from 'lucide-react'

interface ESGPageProps {
  searchParams?: Promise<{ reportId?: string }>
}

export default async function ESGPage({ searchParams }: ESGPageProps) {
  const requestedReportId = (await searchParams)?.reportId ?? null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('*')
    .eq('supabase_user_id', user!.id).single()
  const report = await getPreferredReport(supabase, company!.id, requestedReportId)
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const sectionAvailability = getSectionAvailability(report)
  const esgAvailable = sectionAvailability.esg.status === 'available'
  const esg = report?.esg_disclosure
  const carbonKg = (esg?.carbon_kg ?? report.carbon_kg) as number | null
  const waterLiters = (esg?.water_liters ?? report.water_liters) as number | null
  const modelEfficiencyScore = (esg?.model_efficiency_score ?? report.model_efficiency_score) as number | null
  const prevCarbon = report.prev_carbon_kg ?? null
  const prevWater = report.prev_water_liters ?? null
  const prevScore = report.prev_model_efficiency_score ?? null
  const carbonDelta = carbonKg != null && prevCarbon != null && prevCarbon > 0
    ? ((carbonKg - prevCarbon) / prevCarbon) * 100
    : null
  const waterDelta = waterLiters != null && prevWater != null && prevWater > 0
    ? ((waterLiters - prevWater) / prevWater) * 100
    : null
  const scoreDelta = modelEfficiencyScore != null && prevScore != null
    ? modelEfficiencyScore - prevScore
    : null
  const frameworks: string[] = esg?.frameworks ?? ['CSRD', 'GRI 305', 'IFRS S2', 'CDP']
  const dataFreshness = report.executive_summary?.data_freshness?.latest_complete_day
    ?? report.executive_summary?.data_freshness?.coverage_end
    ?? null
  const frameworkDescriptions: Record<string, string> = {
    CSRD: 'Supports disclosure of AI-related environmental externalities in broader sustainability reporting.',
    'GRI 305': 'Aligns with greenhouse-gas reporting expectations for emissions metrics.',
    'IFRS S2': 'Provides climate-related context for governance, metrics, and targets.',
    CDP: 'Useful for annual climate questionnaires and investor transparency.',
  }

  return (
    <DashboardPage>
      <div className="space-y-5">
        <DashboardHeader
          title="AI environmental disclosure"
          subtitle={`${company?.name} · Reporting period ${esg?.reporting_period ?? report.reporting_period}. Prepare a disclosure-ready ESG narrative for AI usage and efficiency.`}
          badge={<DashboardMetaPill>{dataFreshness ? `Data through ${dataFreshness}` : 'Freshness pending'}</DashboardMetaPill>}
          actions={(
            <div className="flex items-center gap-3">
              <RerunAnalysisButton initialJobState={analysisJob} />
              <DownloadPDFButton />
            </div>
          )}
        />

        <DashboardFilterBar
          items={[
            { label: 'Page', value: 'ESG Export' },
            { label: 'Disclosure State', value: esgAvailable ? 'Disclosure Ready' : 'Partial Report' },
            { label: 'Frameworks', value: `${frameworks.length} mapped` },
            { label: 'Time Period', value: esg?.reporting_period ?? report.reporting_period },
          ]}
          actionLabel="Refresh Disclosure"
        />

        {!esgAvailable && (
          <SectionAvailabilityNotice
            title="ESG environmental metrics unavailable"
            message={sectionAvailability.esg.message ?? 'Connect OpenAI and rerun analysis to populate this section.'}
          />
        )}

        {/* Leadership brief — always included in print/export */}
        <DashboardPanel
          title="Leadership brief"
          subtitle="Business case summary for executive and board-level audiences. Included in every export."
          badge={<DashboardBadge tone="green">Print-ready</DashboardBadge>}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-[#f0f5f3] px-4 py-4">
              <div className="mb-2 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-[#4C7060]" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4C7060]">Financial upside</p>
              </div>
              <p className="text-sm leading-6 text-[#152820]">
                Right-sizing AI model usage directly reduces data centre energy consumption, cooling infrastructure costs, and water bills —
                measurable savings that flow directly to the organisation&apos;s operating budget.
              </p>
            </div>
            <div className="rounded-2xl bg-[#f0f5f3] px-4 py-4">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#4C7060]" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4C7060]">Regulatory compliance</p>
              </div>
              <p className="text-sm leading-6 text-[#152820]">
                EU CSRD mandates disclosure of material environmental impacts — including digital and AI-related emissions — for large organisations with EU operations.
                Non-compliance carries financial penalties and risks investor-facing restatements. This report supports that obligation.
              </p>
            </div>
            <div className="rounded-2xl bg-[#f0f5f3] px-4 py-4">
              <div className="mb-2 flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-[#4C7060]" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4C7060]">International incentives</p>
              </div>
              <p className="text-sm leading-6 text-[#152820]">
                Tax credits, green technology grants, and sustainability-linked financing are available across EU, US, and Asia-Pacific jurisdictions
                for organisations that can demonstrate measurable reductions in their AI environmental footprint. See the Incentives section for matched opportunities.
              </p>
            </div>
            <div className="rounded-2xl bg-[#f0f5f3] px-4 py-4">
              <div className="mb-2 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#4C7060]" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4C7060]">Recognition & positioning</p>
              </div>
              <p className="text-sm leading-6 text-[#152820]">
                Organisations with verified AI sustainability metrics are eligible for CDP A-List recognition, Science Based Targets certification,
                and inclusion in ESG indices — providing competitive differentiation with customers, investors, and regulators.
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-[#d6e4de] bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9aa7a0]">Data privacy note</p>
            <p className="mt-1.5 text-sm leading-6 text-[#60726b]">
              GreenLens measures the organisation&apos;s AI usage in aggregate only. No individual employee data, prompt content, or personal usage patterns
              are captured, stored, or reported. All metrics represent organisation-wide totals derived from provider admin APIs.
            </p>
          </div>
        </DashboardPanel>

        <DashboardStatGrid>
          <DashboardStatCard
            label="AI Carbon"
            value={carbonKg != null ? formatNumber(carbonKg, 0) : '—'}
            unit="kg CO2e"
            helper="Disclosure carbon metric"
            icon={<Leaf className="h-4 w-4" />}
            delta={carbonDelta}
            statusLabel={carbonDelta == null ? 'No prior comparison' : undefined}
            statusTone={carbonDelta != null && carbonDelta > 0 ? 'warning' : 'good'}
          />
          <DashboardStatCard
            label="AI Water"
            value={waterLiters != null ? formatCompactNumber(waterLiters, 1) : '—'}
            unit="liters"
            helper="Cooling-water estimate"
            icon={<Droplets className="h-4 w-4" />}
            delta={waterDelta}
            statusLabel={waterDelta == null ? 'No prior comparison' : undefined}
            statusTone={waterDelta != null && waterDelta > 0 ? 'warning' : 'good'}
          />
          <DashboardStatCard
            label="Model Score"
            value={modelEfficiencyScore != null ? formatNumber(modelEfficiencyScore, 0) : '—'}
            unit="/100 efficiency score"
            helper="AI operating efficiency"
            icon={<Bot className="h-4 w-4" />}
            delta={scoreDelta}
            deltaSuffix=" pts"
            statusLabel={scoreDelta == null ? 'No prior comparison' : undefined}
          />
          <DashboardStatCard
            label="Frameworks"
            value={formatNumber(frameworks.length, 0)}
            unit="alignment targets"
            helper="Disclosure references included"
            icon={<FileText className="h-4 w-4" />}
            statusLabel={esgAvailable ? 'Disclosure-ready package' : 'Partial package'}
            statusTone={esgAvailable ? 'good' : 'warning'}
          />
        </DashboardStatGrid>

        <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <DashboardPanel
            title="Disclosure statement"
            subtitle="The generated narrative intended to support ESG or sustainability reporting workflows."
            badge={<DashboardBadge tone={esgAvailable ? 'green' : 'amber'}>{esgAvailable ? 'Disclosure ready' : 'Partial disclosure'}</DashboardBadge>}
          >
            <div className="rounded-2xl bg-[#fbfcfb] px-5 py-5 text-sm leading-7 text-[#60726b] whitespace-pre-line">
              {esg?.esg_text ?? 'ESG disclosure text will appear here after analysis is complete.'}
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Reporting readiness"
            subtitle="Operational context around completeness, freshness, and how the disclosure should be interpreted."
            badge={<DashboardMetaPill>{esgAvailable ? 'GreenLens generated' : 'Partial evidence'}</DashboardMetaPill>}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <DashboardMiniStat
                label="Reporting period"
                value={esg?.reporting_period ?? report.reporting_period}
                hint="Period represented in the disclosure."
              />
              <DashboardMiniStat
                label="Freshness"
                value={dataFreshness ?? 'Unavailable'}
                hint="Latest day with completed underlying data."
              />
              <DashboardMiniStat
                label="Section status"
                value={esgAvailable ? 'Available' : 'Partial'}
                hint={sectionAvailability.esg.message ?? 'ESG metrics are populated from the current report.'}
                tone={esgAvailable ? 'good' : 'warning'}
              />
              <DashboardMiniStat
                label="Framework count"
                value={formatNumber(frameworks.length, 0)}
                hint="Disclosure frameworks referenced in the output."
              />
            </div>
          </DashboardPanel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <DashboardPanel
            title="Methodology and provenance"
            subtitle="How GreenLens collected source data and transformed it into disclosure-ready metrics."
            badge={<DashboardBadge tone="blue">Methodology</DashboardBadge>}
          >
            <div className="space-y-3">
              <div className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9aa7a0]">Model usage data</p>
                <p className="mt-2 text-sm leading-6 text-[#60726b]">
                  Usage data is collected via provider admin APIs and returns organizational usage metrics such as model identifiers,
                  request counts, and token volumes. Prompt content, completion content, and individual user message content are not accessed.
                </p>
              </div>
              <div className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9aa7a0]">Carbon methodology</p>
                <p className="mt-2 text-sm leading-6 text-[#60726b]">
                  {esg?.carbon_methodology ??
                    'Carbon is estimated from model-specific energy intensity, hyperscale PUE assumptions, and regional grid carbon factors.'}
                </p>
              </div>
              <div className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9aa7a0]">Water methodology</p>
                <p className="mt-2 text-sm leading-6 text-[#60726b]">
                  {esg?.water_methodology ??
                    'Water is estimated from the modeled energy footprint using representative WUE assumptions and direct cooling-water equivalents.'}
                </p>
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Framework alignment"
            subtitle="Illustrative mapping of the generated disclosure to the frameworks most often requested by leadership and reporting teams."
            badge={<DashboardBadge tone="slate">Framework matrix</DashboardBadge>}
          >
            <div className="space-y-3">
              {frameworks.map((framework) => (
                <div key={framework} className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-[#152820]">{framework}</p>
                    <DashboardBadge tone="green">Mapped</DashboardBadge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#60726b]">
                    {frameworkDescriptions[framework] ?? 'Supports narrative and metric alignment for climate-related disclosure workflows.'}
                  </p>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>

        <DashboardPanel
          title="Prior-period comparison"
          subtitle="How the current disclosure metrics compare with the previous report where historical values are available."
          badge={<DashboardBadge tone="blue">Trend framing</DashboardBadge>}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <DashboardMiniStat
              label="Carbon delta"
              value={carbonDelta != null ? `${formatNumber(carbonDelta, 1)}%` : '—'}
              hint={prevCarbon != null ? `Previous period: ${formatNumber(prevCarbon, 0)} kg` : 'No prior carbon baseline stored'}
              tone={carbonDelta != null && carbonDelta > 0 ? 'warning' : 'good'}
            />
            <DashboardMiniStat
              label="Water delta"
              value={waterDelta != null ? `${formatNumber(waterDelta, 1)}%` : '—'}
              hint={prevWater != null ? `Previous period: ${formatCompactNumber(prevWater, 1)} L` : 'No prior water baseline stored'}
              tone={waterDelta != null && waterDelta > 0 ? 'warning' : 'good'}
            />
            <DashboardMiniStat
              label="Score delta"
              value={scoreDelta != null ? `${formatNumber(scoreDelta, 1)} pts` : '—'}
              hint={prevScore != null ? `Previous period: ${formatNumber(prevScore, 0)}/100` : 'No prior efficiency baseline stored'}
              tone={scoreDelta != null && scoreDelta < 0 ? 'warning' : 'good'}
            />
          </div>
        </DashboardPanel>
      </div>
    </DashboardPage>
  )
}
