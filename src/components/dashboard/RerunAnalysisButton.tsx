'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAnalysisJob } from '@/lib/analysis/use-analysis-job'
import type { AnalysisJobState } from '@/lib/analysis/state'
import { buildReportNavigationTarget } from '@/lib/reports/report-navigation'

const AGENT_LABELS: Record<string, string> = {
  usage_analyst: 'Collecting usage data…',
  stat_analysis: 'Running statistical analysis…',
  carbon_water_accountant: 'Calculating carbon and water impact…',
  license_intelligence: 'Reviewing license utilization…',
  strategic_translator: 'Generating strategic recommendations…',
  synthesis: 'Finalizing report…',
}

interface Props {
  initialJobState?: AnalysisJobState | null
}

export default function RerunAnalysisButton({ initialJobState = null }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { loading, jobState, error, triggerAnalysis, statusMessage } = useAnalysisJob({
    initialJobState,
    onComplete: (nextState) => {
      if (!nextState.reportId) {
        router.refresh()
        return
      }

      router.replace(
        buildReportNavigationTarget(pathname, searchParams.toString(), nextState.reportId)
      )
      router.refresh()
    },
  })

  const label = jobState?.current_agent
    ? (AGENT_LABELS[jobState.current_agent] ?? 'Analysis running…')
    : statusMessage ?? 'Analysis running…'

  return (
    <div className="flex items-center gap-3">
      {error && !loading && (
        <span className="text-red-600 text-xs">{error}</span>
      )}
      <button
        onClick={triggerAnalysis}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-2xl border border-[#cfe1d8] bg-white px-4 py-2 text-sm font-medium text-[#1d3b2e] shadow-sm transition-colors hover:border-[#aaccb9] hover:bg-[#edf6f1] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 rounded-full border-2 border-[#6b7d74] border-t-transparent animate-spin" />
            {label}
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-run analysis
          </>
        )}
      </button>
    </div>
  )
}
