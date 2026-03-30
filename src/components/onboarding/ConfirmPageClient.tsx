'use client'

import { useRouter } from 'next/navigation'
import { useAnalysisJob } from '@/lib/analysis/use-analysis-job'
import type { AnalysisJobState } from '@/lib/analysis/state'

interface ConfirmPageClientProps {
  company: {
    name: string
    industry: string | null
    headcount_range: string | null
  }
  integrations: { provider: string; is_active: boolean }[]
  initialJobState: AnalysisJobState | null
}

export default function ConfirmPageClient({
  company,
  integrations,
  initialJobState,
}: ConfirmPageClientProps) {
  const router = useRouter()
  const { error, jobState, loading, statusMessage, triggerAnalysis } = useAnalysisJob({
    initialJobState,
    onComplete: (nextState) => {
      if (!nextState.reportId) {
        router.push('/dashboard')
        return
      }

      router.push(`/dashboard?reportId=${encodeURIComponent(nextState.reportId)}`)
    },
  })

  return (
    <div className="min-h-screen bg-gray-950 p-8 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Ready to run your first analysis</h1>
        <p className="text-gray-400 mb-8">Step 3 of 3</p>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4">
          <p className="text-gray-400 text-sm mb-2">Company</p>
          <p className="text-white font-medium">{company.name}</p>
          <p className="text-gray-400 text-sm">
            {company.industry?.replace(/_/g, ' ') ?? 'Industry not set'} · {company.headcount_range ?? 'Headcount not set'} employees
          </p>
        </div>

        {integrations.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
            <p className="text-gray-400 text-sm mb-2">Connected integrations</p>
            <div className="space-y-1">
              {integrations.map((integration) => (
                <div key={integration.provider} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  <span className="text-white text-sm capitalize">{integration.provider}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <div>
              <p className="text-gray-300 text-sm">Analysis running… this takes about a minute.</p>
              {statusMessage && (
                <p className="text-gray-500 text-xs mt-1">{statusMessage}</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-950 border border-red-700 rounded-xl p-4 mb-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {!loading && jobState?.status === 'failed' && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
            <p className="text-gray-300 text-sm">The last analysis attempt did not finish. You can retry now.</p>
          </div>
        )}

        <button
          onClick={triggerAnalysis}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Running analysis…' : jobState?.status === 'failed' ? 'Retry analysis' : 'Run analysis'}
        </button>
      </div>
    </div>
  )
}
