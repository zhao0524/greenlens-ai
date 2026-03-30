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
  formatCompactNumber,
  formatNumber,
  formatPercent,
  titleize,
} from '@/components/dashboard/DashboardPrimitives'
import RerunAnalysisButton from '@/components/dashboard/RerunAnalysisButton'
import SectionAvailabilityNotice from '@/components/dashboard/SectionAvailabilityNotice'
import TrendChart from '@/components/dashboard/TrendChart'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import { getSectionAvailability } from '@/lib/reports/report-availability'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  LineChart,
} from 'lucide-react'

interface BenchmarkPageProps {
  searchParams?: Promise<{ reportId?: string }>
}

export default async function BenchmarkPage({ searchParams }: BenchmarkPageProps) {
  const requestedReportId = (await searchParams)?.reportId ?? null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name, industry')
    .eq('supabase_user_id', user!.id).single()
  const report = await getPreferredReport(supabase, company!.id, requestedReportId)
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const sectionAvailability = getSectionAvailability(report)
  const benchmarkAvailable = sectionAvailability.benchmark.status === 'available'
  const benchmark = report.benchmark_data
  const stat = report.stat_analysis
  const carbonPercentile = report.carbon_percentile ?? stat?.carbon_percentile?.percentile ?? 0
  const anomalyDetected = report.anomaly_detected ?? stat?.anomaly_detection?.anomaly_detected ?? false
  const trendDirection = report.trend_direction ?? stat?.usage_trend?.trend_direction ?? 'stable'
  const taskClustering = stat?.task_clustering_summary as {
    clusters?: { model: string; task_category: string; appropriate_model_class: string }[]
    method?: string
  } | null
  const meanDailyRequests = stat?.anomaly_detection?.mean_daily_requests ?? null
  const projected30dRequests = stat?.usage_trend?.projected_30d_requests ?? null
  const slope = stat?.usage_trend?.slope ?? null
  const pValue = stat?.usage_trend?.p_value ?? null
  const rSquared = stat?.usage_trend?.r_squared ?? null
  const maxZScore = stat?.anomaly_detection?.max_z_score ?? null
  const stdDev = stat?.anomaly_detection?.std_dev ?? null
  const anomalyDays = stat?.anomaly_detection?.anomaly_day_indices ?? []
  const benchmarkFreshness = benchmark?.data_freshness?.latest_complete_day
    ?? benchmark?.data_freshness?.coverage_end
    ?? null
  const clusterSummary = Object.entries((taskClustering?.clusters ?? []).reduce((acc, cluster) => {
    acc[cluster.task_category] = (acc[cluster.task_category] ?? 0) + 1
    return acc
  }, {} as Record<string, number>))
    .map(([taskCategory, count]) => ({
      taskCategory,
      count,
      share: taskClustering?.clusters?.length ? (count / taskClustering.clusters.length) * 100 : 0,
      recommendedClass: taskClustering?.clusters?.find((cluster) => cluster.task_category === taskCategory)?.appropriate_model_class ?? 'mixed',
    }))
    .sort((a, b) => b.count - a.count)
  const trendData = Array.from({ length: 12 }, (_, index) => {
    const base = meanDailyRequests ?? (projected30dRequests != null ? projected30dRequests / 30 : 780)
    const slopeEffect = (slope ?? 0) * (index - 4) * 2.5
    const seasonality = Math.sin(index / 1.2) * Math.max(28, base * 0.08)
    const anomalyBoost = anomalyDetected && index === 8 ? Math.max(40, base * 0.22) : 0
    return {
      date: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'][index],
      requests: Math.max(80, Math.round(base + slopeEffect + seasonality + anomalyBoost)),
    }
  })

  return (
    <DashboardPage>
      <div className="space-y-5">
        <DashboardHeader
          title="Industry benchmark"
          subtitle={`${company!.name} · ${company!.industry?.replace(/_/g, ' ') ?? 'industry profile unavailable'}. Compare emissions and usage against synthetic sector baselines.`}
          badge={<DashboardMetaPill>{benchmarkFreshness ? `Data through ${benchmarkFreshness}` : 'Benchmark freshness pending'}</DashboardMetaPill>}
          actions={<RerunAnalysisButton initialJobState={analysisJob} />}
        />

        <DashboardFilterBar
          items={[
            { label: 'Page', value: 'Benchmark' },
            { label: 'Industry', value: company!.industry?.replace(/_/g, ' ') ?? 'General benchmark set' },
            { label: 'Trend', value: titleize(trendDirection) },
            { label: 'Time Period', value: report.reporting_period },
          ]}
        />

        {!benchmarkAvailable && (
          <SectionAvailabilityNotice
            title="Benchmark analysis unavailable"
            message={sectionAvailability.benchmark.message ?? 'Connect OpenAI and rerun analysis to populate this section.'}
          />
        )}

        <DashboardStatGrid>
          <DashboardStatCard
            label="Carbon Percentile"
            value={formatNumber(carbonPercentile, 0)}
            unit="th percentile"
            helper="Relative sector position"
            icon={<BarChart3 className="h-4 w-4" />}
            statusLabel={benchmark?.carbon_percentile?.relative_position ?? stat?.carbon_percentile?.relative_position ?? 'Benchmark narrative pending'}
            statusTone={carbonPercentile >= 75 ? 'warning' : 'good'}
          />
          <DashboardStatCard
            label="Trend Direction"
            value={titleize(trendDirection)}
            unit="usage trend"
            helper="Observed from daily request series"
            icon={<LineChart className="h-4 w-4" />}
            statusLabel={stat?.usage_trend?.trend_significant === false ? 'Not statistically significant' : 'Statistically meaningful'}
            statusTone={stat?.usage_trend?.trend_significant === false ? 'neutral' : trendDirection === 'increasing' ? 'warning' : 'good'}
          />
          <DashboardStatCard
            label="Projected 30D"
            value={projected30dRequests != null ? formatCompactNumber(projected30dRequests, 1) : '—'}
            unit="requests"
            helper="Linear projection"
            icon={<Activity className="h-4 w-4" />}
            statusLabel={meanDailyRequests != null ? `${formatCompactNumber(meanDailyRequests, 1)} mean daily requests` : 'Awaiting trend model'}
          />
          <DashboardStatCard
            label="Anomaly Signal"
            value={maxZScore != null ? formatNumber(maxZScore, 2) : '—'}
            unit="max z-score"
            helper="Peak deviation from baseline"
            icon={<AlertTriangle className="h-4 w-4" />}
            statusLabel={anomalyDetected ? `${anomalyDays.length} anomalous day${anomalyDays.length !== 1 ? 's' : ''}` : 'No anomaly flagged'}
            statusTone={anomalyDetected ? 'warning' : 'good'}
          />
        </DashboardStatGrid>

        {!benchmarkAvailable ? (
          <DashboardEmptyState
            title="Benchmark results are not available yet"
            message="Benchmarking relies on enough historical usage data to compare your organization against synthetic sector distributions."
          />
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
              <DashboardPanel
                title="Benchmark positioning"
                subtitle="Where your current carbon intensity lands relative to the benchmark distribution GreenLens uses for your sector."
                badge={<DashboardBadge tone={carbonPercentile >= 75 ? 'amber' : 'green'}>{carbonPercentile >= 75 ? 'Upper-emissions quartile' : 'Within expected range'}</DashboardBadge>}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <DashboardMiniStat
                    label="Your carbon"
                    value={report.carbon_kg != null ? `${formatNumber(report.carbon_kg, 0)} kg` : '—'}
                    hint="Measured for this report period."
                  />
                  <DashboardMiniStat
                    label="Sector median"
                    value={stat?.carbon_percentile?.industry_mean_kg != null ? `${formatNumber(stat.carbon_percentile.industry_mean_kg, 0)} kg` : '—'}
                    hint="Synthetic benchmark midpoint."
                  />
                  <DashboardMiniStat
                    label="Std deviation"
                    value={stat?.carbon_percentile?.industry_std_kg != null ? `±${formatNumber(stat.carbon_percentile.industry_std_kg, 0)} kg` : '—'}
                    hint="Expected spread around the benchmark mean."
                  />
                  <DashboardMiniStat
                    label="Relative position"
                    value={benchmark?.carbon_percentile?.relative_position ?? stat?.carbon_percentile?.relative_position ?? '—'}
                    hint="Narrative interpretation of your percentile."
                    tone={carbonPercentile >= 75 ? 'warning' : 'good'}
                  />
                </div>

                <div className="mt-4 rounded-2xl bg-[#fbfcfb] px-4 py-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#7f8f88]">Lower benchmark emissions</span>
                    <span className="font-medium text-[#152820]">{formatPercent(carbonPercentile, 0)}</span>
                    <span className="text-[#7f8f88]">Higher benchmark emissions</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e4ece7]">
                    <div className="h-full rounded-full bg-[#38b76a]" style={{ width: `${Math.min(100, carbonPercentile)}%` }} />
                  </div>
                  <p className="mt-3 text-xs text-[#7f8f88]">{stat?.carbon_percentile?.method}</p>
                </div>
              </DashboardPanel>

              <DashboardPanel
                title="Trend trajectory"
                subtitle="Illustrative intraperiod request pattern derived from the benchmark trend model."
                badge={<DashboardMetaPill>{titleize(trendDirection)}</DashboardMetaPill>}
              >
                <TrendChart data={trendData} />
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <DashboardMiniStat
                    label="Slope"
                    value={slope != null ? formatNumber(slope, 2) : '—'}
                    hint="Requests per day change."
                    tone={trendDirection === 'increasing' ? 'warning' : 'default'}
                  />
                  <DashboardMiniStat
                    label="R-squared"
                    value={rSquared != null ? formatNumber(rSquared, 2) : '—'}
                    hint="How well the linear model fits the observed series."
                  />
                  <DashboardMiniStat
                    label="P-value"
                    value={pValue != null ? formatNumber(pValue, 3) : '—'}
                    hint={stat?.usage_trend?.trend_significant === false ? 'Trend is not statistically significant.' : 'Trend meets significance threshold.'}
                    tone={stat?.usage_trend?.trend_significant === false ? 'warning' : 'good'}
                  />
                </div>
              </DashboardPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <DashboardPanel
                title="Statistical confidence"
                subtitle="Key metrics behind the anomaly and trend conclusions so the report can be interpreted with the right level of confidence."
                badge={<DashboardBadge tone={anomalyDetected ? 'amber' : 'green'}>{anomalyDetected ? 'Anomaly detected' : 'Normal range'}</DashboardBadge>}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <DashboardMiniStat
                    label="Mean daily requests"
                    value={meanDailyRequests != null ? formatCompactNumber(meanDailyRequests, 1) : '—'}
                    hint="Average activity level used by anomaly detection."
                  />
                  <DashboardMiniStat
                    label="Standard deviation"
                    value={stdDev != null ? formatNumber(stdDev, 2) : '—'}
                    hint="Expected day-to-day variability."
                  />
                  <DashboardMiniStat
                    label="Max z-score"
                    value={maxZScore != null ? formatNumber(maxZScore, 2) : '—'}
                    hint="Largest deviation from the modeled baseline."
                    tone={maxZScore != null && maxZScore > 2.5 ? 'warning' : 'default'}
                  />
                  <DashboardMiniStat
                    label="Anomaly days"
                    value={anomalyDays.length > 0 ? anomalyDays.join(', ') : 'None'}
                    hint="Index positions flagged in the daily request series."
                    tone={anomalyDays.length > 0 ? 'warning' : 'good'}
                  />
                </div>

                <div className="mt-4 space-y-3">
                  <DashboardBarRow
                    label="Trend significance"
                    value={stat?.usage_trend?.trend_significant === false ? 'Low confidence' : 'Meaningful signal'}
                    percentage={rSquared != null ? rSquared * 100 : 25}
                    tone={stat?.usage_trend?.trend_significant === false ? 'amber' : 'green'}
                    hint={stat?.usage_trend?.method ?? 'Trend methodology unavailable'}
                  />
                  <DashboardBarRow
                    label="Anomaly detection confidence"
                    value={anomalyDetected ? 'Escalated' : 'Contained'}
                    percentage={maxZScore != null ? Math.min(100, maxZScore * 20) : 20}
                    tone={anomalyDetected ? 'amber' : 'green'}
                    hint={stat?.anomaly_detection?.method ?? 'Anomaly methodology unavailable'}
                  />
                </div>
              </DashboardPanel>

              <DashboardPanel
                title="Task cluster context"
                subtitle="Task mix helps explain whether benchmark movement is driven by lightweight routing or higher-intensity reasoning workloads."
                badge={<DashboardMetaPill>{taskClustering?.clusters?.length ?? 0} classified workload clusters</DashboardMetaPill>}
              >
                {clusterSummary.length > 0 ? (
                  <div className="space-y-3">
                    {clusterSummary.map((cluster) => (
                      <DashboardBarRow
                        key={cluster.taskCategory}
                        label={titleize(cluster.taskCategory)}
                        value={`${cluster.count} models`}
                        percentage={cluster.share}
                        hint={`Recommended class: ${titleize(cluster.recommendedClass)}`}
                      />
                    ))}
                    {taskClustering?.method && (
                      <p className="rounded-2xl bg-[#fbfcfb] px-4 py-3 text-sm leading-6 text-[#60726b]">
                        {taskClustering.method}
                      </p>
                    )}
                  </div>
                ) : (
                  <DashboardEmptyState
                    title="Task cluster context is not available"
                    message="GreenLens will surface task clustering here once enough usage records can be segmented into repeatable workload types."
                  />
                )}
              </DashboardPanel>
            </div>

            {report.executive_summary?.hype_cycle_context && (
              <DashboardPanel
                title="Hype-cycle narrative"
                subtitle="Executive framing for how current usage patterns align with broader market maturity."
                badge={<DashboardBadge tone="blue">Narrative context</DashboardBadge>}
              >
                <p className="text-sm leading-7 text-[#60726b]">{report.executive_summary.hype_cycle_context}</p>
              </DashboardPanel>
            )}
          </>
        )}
      </div>
    </DashboardPage>
  )
}
