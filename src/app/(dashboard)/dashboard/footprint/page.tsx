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
  formatCompactNumber,
  formatNumber,
  formatPercent,
} from '@/components/dashboard/DashboardPrimitives'
import { DashboardFilterSelect } from '@/components/dashboard/DashboardFilterSelect'
import FootprintChart from '@/components/dashboard/FootprintChart'
import { AnimatedSection } from '@/components/dashboard/AnimatedSection'
import RerunAnalysisButton from '@/components/dashboard/RerunAnalysisButton'
import SectionAvailabilityNotice from '@/components/dashboard/SectionAvailabilityNotice'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import { getCompanyReports } from '@/lib/reports/get-company-reports'
import { getSectionAvailability } from '@/lib/reports/report-availability'
import {
  Droplets,
  Leaf,
  Sparkles,
  Waves,
} from 'lucide-react'

interface FootprintPageProps {
  searchParams?: Promise<{ reportId?: string; model?: string }>
}

export default async function FootprintPage({ searchParams }: FootprintPageProps) {
  const params = await searchParams
  const requestedReportId = params?.reportId ?? null
  const modelFilter = params?.model ?? 'all'
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
  const carbonWaterAvailable = sectionAvailability.carbon_water.status === 'available'
  const footprint = report.footprint_detail
  // Synthesis writes carbon_by_model (array of {model, carbonKg, percentage})
  const byModel: { model: string; carbonKg: number; percentage: number }[] = footprint?.carbon_by_model ?? []
  const filteredByModel = modelFilter === 'all' ? byModel : byModel.filter((m) => m.model === modelFilter)
  const chartData = byModel.map(m => ({ model: m.model, carbon_kg: m.carbonKg }))
  const portfolioCarbonKg = footprint?.total_carbon_kg ?? report.carbon_kg ?? null
  const selectedModel = modelFilter !== 'all' ? byModel.find((m) => m.model === modelFilter) ?? null : null
  const totalCarbonKg = selectedModel?.carbonKg ?? portfolioCarbonKg
  const totalWaterLiters = footprint?.total_water_liters ?? report.water_liters ?? null
  const alternativeCarbonKg = footprint?.alternative_carbon_kg ?? null
  const savingsKg = footprint?.carbon_savings_kg ?? (
    portfolioCarbonKg != null && alternativeCarbonKg != null
      ? Math.max(0, portfolioCarbonKg - alternativeCarbonKg)
      : null
  )
  const waterSavingsLiters = footprint?.water_savings_liters ?? null
  const waterBottles = footprint?.water_bottles ?? (
    totalWaterLiters != null ? Math.round(totalWaterLiters / 0.519) : null
  )
  const reductionRate = portfolioCarbonKg != null && savingsKg != null && portfolioCarbonKg > 0
    ? (savingsKg / portfolioCarbonKg) * 100
    : null
  const topEmitter = [...byModel].sort((a, b) => b.carbonKg - a.carbonKg)[0] ?? null
  // When a model is selected, treat it as the "focus emitter" for stat displays
  const focusEmitter = selectedModel ?? topEmitter
  const waterSavingsBottles = waterSavingsLiters != null ? Math.round(waterSavingsLiters / 0.519) : null
  const carbonConfidence = footprint?.data_freshness?.latest_complete_day ?? footprint?.data_freshness?.coverage_end ?? null

  return (
    <DashboardPage>
      <div className="space-y-5">
        <DashboardHeader
          title="Carbon and water footprint"
          subtitle={`${company!.name} · ${report.reporting_period}. Understand where AI emissions are concentrated and what reductions are realistically available.`}
          badge={<DashboardMetaPill>{filteredByModel.length > 0 ? `${filteredByModel.length} emitting models tracked` : 'Awaiting footprint detail'}</DashboardMetaPill>}
          actions={<RerunAnalysisButton initialJobState={analysisJob} />}
        />

        <Suspense>
          <DashboardFilterBar>
            <DashboardFilterSelect
              label="Model"
              paramKey="model"
              value={modelFilter}
              options={[
                { label: 'All Models', value: 'all' },
                ...byModel.sort((a, b) => b.carbonKg - a.carbonKg).map((m) => ({ label: m.model, value: m.model })),
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
            <DashboardFilterPill label="Scenario" value={alternativeCarbonKg != null ? 'Actual vs Optimized' : 'Actual Only'} />
          </DashboardFilterBar>
        </Suspense>

        {!carbonWaterAvailable && (
          <SectionAvailabilityNotice
            title="Carbon and water analysis unavailable"
            message={sectionAvailability.carbon_water.message ?? 'Connect OpenAI and rerun analysis to populate this section.'}
          />
        )}

        <AnimatedSection animKey={modelFilter}>
        <DashboardStatGrid>
          <DashboardStatCard
            label="Total Carbon"
            value={totalCarbonKg != null ? formatNumber(totalCarbonKg, totalCarbonKg < 100 ? 1 : 0) : '—'}
            unit="kg CO2e this period"
            helper={selectedModel ? `${selectedModel.model} emissions` : 'Measured AI emissions'}
            icon={<Leaf className="h-4 w-4" />}
            statusLabel={selectedModel ? `${formatPercent(selectedModel.percentage, 0)} of portfolio` : topEmitter ? `${topEmitter.model} leads emissions` : 'Awaiting model detail'}
            statusTone={selectedModel ? (selectedModel.percentage > 50 ? 'warning' : 'good') : topEmitter && topEmitter.percentage > 50 ? 'warning' : 'good'}
          />
          <DashboardStatCard
            label="Water Usage"
            value={totalWaterLiters != null ? formatCompactNumber(totalWaterLiters, 1) : '—'}
            unit="liters"
            helper="Cooling-water estimate"
            icon={<Droplets className="h-4 w-4" />}
            statusLabel={waterBottles != null ? `${formatCompactNumber(waterBottles, 1)} bottles equivalent` : 'Awaiting water estimate'}
          />
          <DashboardStatCard
            label="Carbon Savings"
            value={savingsKg != null ? formatNumber(savingsKg, savingsKg < 100 ? 1 : 0) : '—'}
            unit="kg CO2e avoidable"
            helper="If optimal model selection is adopted"
            icon={<Sparkles className="h-4 w-4" />}
            statusLabel={reductionRate != null ? `${formatPercent(reductionRate, 0)} reduction headroom` : 'Scenario unavailable'}
            statusTone={reductionRate != null && reductionRate > 15 ? 'warning' : 'good'}
          />
          <DashboardStatCard
            label="Water Savings"
            value={waterSavingsLiters != null ? formatCompactNumber(waterSavingsLiters, 1) : '—'}
            unit="liters avoidable"
            helper="Potential cooling-water reduction"
            icon={<Waves className="h-4 w-4" />}
            statusLabel={waterSavingsBottles != null ? `${formatCompactNumber(waterSavingsBottles, 1)} bottles saved` : 'Scenario unavailable'}
            statusTone={waterSavingsLiters != null && waterSavingsLiters > 0 ? 'good' : 'neutral'}
          />
        </DashboardStatGrid>
        </AnimatedSection>

        {totalCarbonKg == null && totalWaterLiters == null ? (
          <DashboardEmptyState
            title="No footprint metrics are available yet"
            message="Run a completed analysis with supported AI usage data to populate carbon and water tracking."
          />
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
              <DashboardPanel
                title="Carbon by model"
                subtitle="Model-level emissions concentration for the current reporting window."
                badge={<DashboardMetaPill>{focusEmitter ? `${focusEmitter.model} is the top emitter` : 'Model detail pending'}</DashboardMetaPill>}
                fillHeight
              >
                {chartData.length > 0 ? (
                  <>
                    <div className="relative flex-1">
                      <div className="absolute inset-0">
                        <FootprintChart data={chartData} selectedModel={modelFilter === 'all' ? null : modelFilter} />
                      </div>
                    </div>
                    <AnimatedSection animKey={modelFilter} className="mt-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <DashboardMiniStat
                        label={selectedModel ? 'Selected model' : 'Top emitter'}
                        value={focusEmitter ? focusEmitter.model : '—'}
                        hint={focusEmitter ? `${focusEmitter.carbonKg.toFixed(2)} kg CO2e` : 'Awaiting model ranking'}
                        tone={focusEmitter && focusEmitter.percentage > 50 ? 'warning' : 'default'}
                      />
                      <DashboardMiniStat
                        label={selectedModel ? 'Share of portfolio' : 'Portfolio concentration'}
                        value={focusEmitter ? formatPercent(focusEmitter.percentage, 0) : '—'}
                        hint={selectedModel ? `${focusEmitter?.model} carbon share.` : 'Share held by the highest-emitting model.'}
                      />
                      <DashboardMiniStat
                        label="Models contributing"
                        value={formatNumber(filteredByModel.length, 0)}
                        hint="Tracked in the footprint breakdown."
                      />
                    </div>
                    </AnimatedSection>
                  </>
                ) : (
                  <DashboardEmptyState
                    title="Model-level emissions breakdown is not available"
                    message="This panel fills in after GreenLens can attribute emissions to specific models."
                  />
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Reduction scenario"
                subtitle="How the footprint changes if model selection is shifted toward better-fit workloads."
                badge={<DashboardBadge tone={reductionRate != null && reductionRate > 10 ? 'amber' : 'green'}>{reductionRate != null ? `${formatPercent(reductionRate, 0)} reduction potential` : 'Scenario pending'}</DashboardBadge>}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <DashboardMiniStat
                    label="Actual footprint"
                    value={totalCarbonKg != null ? `${formatNumber(totalCarbonKg, 0)} kg` : '—'}
                    hint="Observed AI carbon output."
                  />
                  <DashboardMiniStat
                    label="Optimized footprint"
                    value={alternativeCarbonKg != null ? `${formatNumber(alternativeCarbonKg, 0)} kg` : '—'}
                    hint="Expected output under better-fit routing."
                    tone="good"
                  />
                  <DashboardMiniStat
                    label="Avoidable carbon"
                    value={savingsKg != null ? `${formatNumber(savingsKg, 0)} kg` : '—'}
                    hint="Difference between actual and optimized footprint."
                    tone={savingsKg != null && savingsKg > 0 ? 'warning' : 'default'}
                  />
                  <DashboardMiniStat
                    label="Water linkage"
                    value={waterSavingsLiters != null ? `${formatCompactNumber(waterSavingsLiters, 1)} L` : '—'}
                    hint="Estimated water avoided alongside lower energy demand."
                    tone="good"
                  />
                </div>

                {totalCarbonKg != null && (
                  <div className="mt-4 space-y-3">
                    <DashboardBarRow
                      label="Current operating footprint"
                      value={`${formatNumber(totalCarbonKg, 0)} kg`}
                      percentage={100}
                      tone="slate"
                      hint="Baseline emissions under current model mix."
                    />
                    <DashboardBarRow
                      label="Optimized routing scenario"
                      value={alternativeCarbonKg != null ? `${formatNumber(alternativeCarbonKg, 0)} kg` : '—'}
                      percentage={totalCarbonKg > 0 && alternativeCarbonKg != null ? (alternativeCarbonKg / totalCarbonKg) * 100 : 0}
                      tone="green"
                      hint="Illustrative footprint if better-fit models are chosen."
                    />
                  </div>
                )}
              </DashboardPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <DashboardPanel
                title="Water equivalency"
                subtitle="Cooling-water impact translated into quantities easier for stakeholders to reason about."
                badge={<DashboardBadge tone="blue">Resource framing</DashboardBadge>}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <DashboardMiniStat
                    label="Total water"
                    value={totalWaterLiters != null ? `${formatCompactNumber(totalWaterLiters, 1)} L` : '—'}
                    hint="Direct cooling-water estimate."
                  />
                  <DashboardMiniStat
                    label="Bottle equivalent"
                    value={waterBottles != null ? formatCompactNumber(waterBottles, 1) : '—'}
                    hint="Approximate 500ml bottles represented."
                  />
                  <DashboardMiniStat
                    label="Water savings"
                    value={waterSavingsLiters != null ? `${formatCompactNumber(waterSavingsLiters, 1)} L` : '—'}
                    hint="Potential reduction under optimized routing."
                    tone="good"
                  />
                  <DashboardMiniStat
                    label="Saved bottle equivalent"
                    value={waterSavingsBottles != null ? formatCompactNumber(waterSavingsBottles, 1) : '—'}
                    hint="Illustrative avoided bottle count."
                    tone="good"
                  />
                </div>
              </DashboardPanel>

              <DashboardPanel
                title="Methodology and confidence"
                subtitle="How GreenLens estimated footprint values and what period the data most likely represents."
                badge={<DashboardMetaPill>{carbonConfidence ? `Data through ${carbonConfidence}` : 'Freshness pending'}</DashboardMetaPill>}
              >
                <div className="space-y-3">
                  <div className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4a6459]">Carbon methodology</p>
                    <p className="mt-2 text-sm leading-6 text-[#2e4a40]">
                      {footprint?.carbon_methodology ??
                        'Carbon is modeled from provider usage data, model-specific energy intensity assumptions, regional grid factors, and a hyperscale data-center PUE baseline.'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#fbfcfb] px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4a6459]">Water methodology</p>
                    <p className="mt-2 text-sm leading-6 text-[#2e4a40]">
                      {footprint?.water_methodology ??
                        'Water usage is estimated from energy demand using representative WUE assumptions and translated into direct cooling-water equivalents.'}
                    </p>
                  </div>
                </div>
              </DashboardPanel>
            </div>

            <DashboardPanel
              title="Model emission breakdown"
              subtitle="Detailed view of how each model contributes to the total footprint."
              badge={<DashboardMetaPill>{filteredByModel.length > 0 ? `${filteredByModel.length} rows` : 'No rows yet'}</DashboardMetaPill>}
            >
              {filteredByModel.length > 0 ? (
                <DashboardTable
                  headers={['Model', 'Carbon', 'Share', 'Interpretation']}
                  rows={filteredByModel
                    .sort((a, b) => b.carbonKg - a.carbonKg)
                    .map((model) => [
                      <span key={`${model.model}-name`} className="font-medium text-[#152820]">{model.model}</span>,
                      <span key={`${model.model}-carbon`}>{model.carbonKg.toFixed(3)} kg</span>,
                      <span key={`${model.model}-share`} className="font-medium text-[#152820]">{formatPercent(model.percentage, 0)}</span>,
                      <span key={`${model.model}-note`} className="text-[#2e4a40]">
                        {model.percentage > 50
                          ? 'Primary emissions driver this period.'
                          : model.percentage > 20
                            ? 'Meaningful contributor worth monitoring.'
                            : 'Secondary contributor in the portfolio.'}
                      </span>,
                    ])}
                />
              ) : (
                <DashboardEmptyState
                  title="No model emission rows are available"
                  message="Model attribution is only shown when GreenLens can map your usage to specific model outputs."
                />
              )}
            </DashboardPanel>
          </>
        )}
      </div>
    </DashboardPage>
  )
}
