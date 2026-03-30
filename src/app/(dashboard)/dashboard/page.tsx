import { createClient } from '@/lib/supabase/server'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import OverviewDashboard from '@/components/dashboard/OverviewDashboard'
import RerunAnalysisButton from '@/components/dashboard/RerunAnalysisButton'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import { getCompanyReports } from '@/lib/reports/get-company-reports'
import {
  getReportFreshness,
  getSectionAvailability,
} from '@/lib/reports/report-availability'

interface DashboardPageProps {
  searchParams?: Promise<{ reportId?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const requestedReportId = (await searchParams)?.reportId ?? null
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
  const freshness = getReportFreshness(report)
  const carbonWaterAvailable = sectionAvailability.carbon_water.status === 'available'
  const modelEfficiencyAvailable = sectionAvailability.model_efficiency.status === 'available'
  const benchmarkAvailable = sectionAvailability.benchmark.status === 'available'
  const licenseAvailable = sectionAvailability.license.status === 'available'
  const anomalyDetected = benchmarkAvailable
    ? report.anomaly_detected ?? report.stat_analysis?.anomaly_detection?.anomaly_detected ?? false
    : false
  const carbonPercentile = benchmarkAvailable
    ? report.carbon_percentile ?? report.stat_analysis?.carbon_percentile?.percentile ?? null
    : null
  const trendDirection = benchmarkAvailable
    ? report.trend_direction ?? report.stat_analysis?.usage_trend?.trend_direction ?? null
    : null
  const latestCompleteDay = freshness?.latest_complete_day ?? freshness?.coverage_end ?? null

  const carbonDelta = carbonWaterAvailable && report.prev_carbon_kg && report.carbon_kg != null
    ? Math.round(((report.carbon_kg - report.prev_carbon_kg) / report.prev_carbon_kg) * 100) : null
  const scoreDelta = modelEfficiencyAvailable && report.prev_model_efficiency_score && report.model_efficiency_score != null
    ? report.model_efficiency_score - report.prev_model_efficiency_score : null
  const utilizationRate = licenseAvailable && report.license_utilization_rate != null
    ? Math.round(report.license_utilization_rate)
    : null

  return (
    <OverviewDashboard
      companyName={company!.name}
      reportPeriod={report.reporting_period}
      requestedReportId={requestedReportId}
      availableReports={availableReports}
      latestCompleteDay={latestCompleteDay}
      anomalyDetected={anomalyDetected}
      benchmarkAvailable={benchmarkAvailable}
      carbonKg={carbonWaterAvailable ? report.carbon_kg ?? null : null}
      carbonDelta={carbonDelta}
      waterLiters={carbonWaterAvailable ? report.water_liters ?? null : null}
      modelEfficiencyScore={modelEfficiencyAvailable ? report.model_efficiency_score ?? null : null}
      modelScoreDelta={scoreDelta}
      licenseUtilizationRate={utilizationRate}
      projected30dRequests={benchmarkAvailable ? report.stat_analysis?.usage_trend?.projected_30d_requests ?? null : null}
      trendDirection={trendDirection}
      carbonPercentile={carbonPercentile}
      benchmarkSummary={benchmarkAvailable ? report.benchmark_data?.carbon_percentile?.relative_position ?? null : sectionAvailability.benchmark.message ?? null}
    >
      <RerunAnalysisButton initialJobState={analysisJob} />
    </OverviewDashboard>
  )
}
