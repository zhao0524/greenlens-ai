'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAnalysisJob } from '@/lib/analysis/use-analysis-job'
import type { AnalysisJobState } from '@/lib/analysis/state'
import { buildReportNavigationTarget } from '@/lib/reports/report-navigation'

interface AnalysisTriggerScreenProps {
  companyId: string
  initialJobState?: AnalysisJobState | null
}

export default function AnalysisTriggerScreen({
  companyId,
  initialJobState = null,
}: AnalysisTriggerScreenProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { error, jobState, loading, statusMessage, triggerAnalysis } = useAnalysisJob({
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

  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 py-8 lg:px-6" data-company-id={companyId}>
      <div className="w-full max-w-2xl rounded-[28px] border border-[#e6ede8] bg-white p-8 text-center shadow-[0_18px_50px_rgba(18,38,29,0.08)] lg:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#edf6f1] text-[#2e6a54]">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>

        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-[#12241d]">Ready to analyze your AI footprint</h1>
        <p className="mx-auto mb-8 max-w-xl text-sm leading-7 text-[#7f8f88]">
          GreenLens will fetch usage data from your connected integrations, calculate your carbon and
          water impact, and generate strategic recommendations. This takes about 60–90 seconds.
        </p>

        {loading && (
          <div className="mb-6 rounded-2xl border border-[#dce9e2] bg-[#f7fbf8] p-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[#2e6a54] border-t-transparent animate-spin" />
              <div className="text-left">
                <p className="text-sm font-medium text-[#152820]">Analysis running. This takes about a minute.</p>
                {statusMessage && (
                  <p className="mt-1 text-xs text-[#7f8f88]">{statusMessage}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && jobState?.status === 'failed' && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">The last analysis attempt did not finish. You can retry now.</p>
          </div>
        )}

        <button
          onClick={triggerAnalysis}
          disabled={loading}
          className="w-full rounded-2xl bg-[#3ac56d] py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(58,197,109,0.28)] transition hover:bg-[#35b964] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Running analysis…' : jobState?.status === 'failed' ? 'Retry analysis' : 'Run analysis now'}
        </button>

        <p className="mt-4 text-xs text-[#9aa7a0]">
          Data is sourced from admin APIs only. No individual user content is accessed.
        </p>
      </div>
    </div>
  )
}
