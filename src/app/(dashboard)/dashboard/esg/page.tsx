import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import {
  DashboardBadge,
  DashboardFilterBar,
  DashboardFilterPill,
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
import { DashboardFilterSelect } from '@/components/dashboard/DashboardFilterSelect'
import DownloadPDFButton from '@/components/dashboard/ESGExport'
import RerunAnalysisButton from '@/components/dashboard/RerunAnalysisButton'
import SectionAvailabilityNotice from '@/components/dashboard/SectionAvailabilityNotice'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import { getCompanyReports } from '@/lib/reports/get-company-reports'
import { getSectionAvailability } from '@/lib/reports/report-availability'
import {
  Bot,
  Database,
  Droplets,
  FileText,
  Leaf,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface ESGPageProps {
  searchParams?: Promise<{ reportId?: string }>
}

export default async function ESGPage({ searchParams }: ESGPageProps) {
  const requestedReportId = (await searchParams)?.reportId ?? null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('*')
    .eq('supabase_user_id', user!.id).single()
  const [report, availableReports] = await Promise.all([
    getPreferredReport(supabase, company!.id, requestedReportId),
    getCompanyReports(supabase, company!.id),
  ])
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
              <DownloadPDFButton reportId={report.id} />
            </div>
          )}
        />

        <Suspense>
          <DashboardFilterBar>
            <DashboardFilterSelect
              label="Period"
              paramKey="reportId"
              value={requestedReportId ?? 'all'}
              options={[
                { label: `${report.reporting_period} (latest)`, value: 'all' },
                ...availableReports.filter((r) => r.id !== report.id).map((r) => ({ label: r.reporting_period, value: r.id })),
              ]}
            />
            <DashboardFilterPill label="Disclosure State" value={esgAvailable ? 'Disclosure Ready' : 'Partial Report'} />
            <DashboardFilterPill label="Frameworks" value={`${frameworks.length} mapped`} />
          </DashboardFilterBar>
        </Suspense>

        {!esgAvailable && (
          <SectionAvailabilityNotice
            title="ESG environmental metrics unavailable"
            message={sectionAvailability.esg.message ?? 'Connect OpenAI and rerun analysis to populate this section.'}
          />
        )}

        <div className="fade-in-up stagger-2">
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
        </div>

        <div className="fade-in-up stagger-3">
        <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <DashboardPanel
            title="Disclosure statement"
            subtitle="The generated narrative intended to support ESG or sustainability reporting workflows."
            badge={<DashboardBadge tone={esgAvailable ? 'green' : 'amber'}>{esgAvailable ? 'Disclosure ready' : 'Partial disclosure'}</DashboardBadge>}
          >
            <div className="rounded-2xl border border-[#e6efe9] bg-[#f8fcf9]">
              <div className="flex items-center justify-between border-b border-[#e6efe9] px-5 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-[#38b76a]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3d6454]">
                    ESG Disclosure — {esg?.reporting_period ?? report.reporting_period}
                  </span>
                </div>
                <span className="rounded-full bg-[#eaf7ee] px-2.5 py-0.5 text-[10px] font-semibold text-[#1e7d45]">
                  {esgAvailable ? 'Disclosure ready' : 'Draft'}
                </span>
              </div>
              <div className="px-5 py-5 text-sm leading-7 text-[#2e4a40] whitespace-pre-line">
                {esg?.esg_text ?? 'ESG disclosure text will appear here after analysis is complete.'}
              </div>
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
        </div>

        <div className="fade-in-up stagger-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <DashboardPanel
            title="Methodology and provenance"
            subtitle="How GreenLens collected source data and transformed it into disclosure-ready metrics."
            badge={<DashboardBadge tone="blue">Methodology</DashboardBadge>}
          >
            <div className="space-y-3">
              <div className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f5ee] text-[#38b76a]">
                    <Database className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4a6459]">Model usage data</p>
                </div>
                <p className="text-sm leading-6 text-[#2e4a40]">
                  Usage data is collected via provider admin APIs and returns organizational usage metrics such as model identifiers,
                  request counts, and token volumes. Prompt content, completion content, and individual user message content are not accessed.
                </p>
              </div>
              <div className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f5ee] text-[#38b76a]">
                    <Leaf className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4a6459]">Carbon methodology</p>
                </div>
                <p className="text-sm leading-6 text-[#2e4a40]">
                  {esg?.carbon_methodology ??
                    'Carbon is estimated from model-specific energy intensity, hyperscale PUE assumptions, and regional grid carbon factors.'}
                </p>
              </div>
              <div className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#deeef9] text-[#2f7fc4]">
                    <Droplets className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4a6459]">Water methodology</p>
                </div>
                <p className="text-sm leading-6 text-[#2e4a40]">
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
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#38b76a]" />
                      <p className="font-medium text-[#152820]">{framework}</p>
                    </div>
                    <DashboardBadge tone="green">Mapped</DashboardBadge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#2e4a40]">
                    {frameworkDescriptions[framework] ?? 'Supports narrative and metric alignment for climate-related disclosure workflows.'}
                  </p>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>
        </div>

        <div className="fade-in-up stagger-5">
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
      </div>
    </DashboardPage>
  )
}
