import {
  isActiveAnalysisStatus,
  type AnalysisJobState,
} from '@/lib/analysis/state'

interface ReportFreshness {
  latest_complete_day?: string | null
  coverage_end?: string | null
  as_of?: string | null
}

interface ReportExecutiveSummary {
  data_freshness?: ReportFreshness | null
}

interface ActiveAnalysisBannerProps {
  analysisJob: AnalysisJobState | null
  reportingPeriod?: string | null
  executiveSummary?: ReportExecutiveSummary | null
}

export default function ActiveAnalysisBanner({
  analysisJob,
  reportingPeriod = null,
  executiveSummary = null,
}: ActiveAnalysisBannerProps) {
  if (!analysisJob || !isActiveAnalysisStatus(analysisJob.status)) {
    return null
  }

  const freshness = executiveSummary?.data_freshness
  const latestCompleteDay = freshness?.latest_complete_day ?? freshness?.coverage_end ?? null
  const refreshedAt = freshness?.as_of ?? null

  return (
    <div className="mx-4 mt-4 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 lg:mx-6">
      <p className="text-sm text-amber-900">
        A newer analysis is running. The dashboard below still reflects your last completed report
        {latestCompleteDay ? ` through ${latestCompleteDay}` : reportingPeriod ? ` for ${reportingPeriod}` : ''}.
        It will refresh automatically when the new run finishes.
      </p>
      {refreshedAt && (
        <p className="mt-1 text-xs text-amber-700/80">
          Last completed report visible as of {new Date(refreshedAt).toLocaleString()}.
        </p>
      )}
    </div>
  )
}
