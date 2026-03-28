'use client'

import { useRouter } from 'next/navigation'
import { useAnalysisJob } from '@/lib/analysis/use-analysis-job'

const AGENT_LABELS: Record<string, string> = {
  usage_analyst: 'Collecting usage data…',
  stat_analysis: 'Running statistical analysis…',
  carbon_water_accountant: 'Calculating carbon and water impact…',
  license_intelligence: 'Reviewing license utilization…',
  strategic_translator: 'Generating strategic recommendations…',
  synthesis: 'Finalizing report…',
}

export default function RerunAnalysisButton() {
  const router = useRouter()
  const { loading, jobState, error, triggerAnalysis, statusMessage } = useAnalysisJob({
    onComplete: () => router.refresh(),
  })

  const label = jobState?.current_agent
    ? (AGENT_LABELS[jobState.current_agent] ?? 'Analysis running…')
    : statusMessage ?? 'Analysis running…'

  return (
    <div className="flex items-center gap-3">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-3.5 h-3.5 border-2 border-green-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>{label}</span>
        </div>
      )}
      {error && !loading && (
        <span className="text-red-400 text-xs">{error}</span>
      )}
      <button
        onClick={triggerAnalysis}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 border border-gray-600 transition-colors"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Running…
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
