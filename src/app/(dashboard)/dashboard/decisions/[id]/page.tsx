import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'

interface DecisionDetailProps {
  params: Promise<{ id: string }>
}

export default async function DecisionDetailPage({ params }: DecisionDetailProps) {
  const { id } = await params
  const index = parseInt(id, 10) - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const { data: report } = await supabase.from('reports').select('*')
    .eq('company_id', company!.id).order('created_at', { ascending: false }).limit(1).single()
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const decisions = report.strategic_decisions?.decisions
    ?.sort((a: { impactScore: number }, b: { impactScore: number }) => b.impactScore - a.impactScore) ?? []

  const decision = decisions[index]

  if (!decision) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/dashboard/decisions" className="text-gray-400 hover:text-white text-sm mb-8 inline-block">
          ← Back to decisions
        </Link>
        <p className="text-gray-400">Decision not found.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/dashboard/decisions" className="text-gray-400 hover:text-white text-sm mb-8 inline-block">
        ← Back to decisions
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-gray-500 text-sm font-mono">Decision #{id}</span>
          {decision.urgencyTier && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              decision.urgencyTier?.toLowerCase() === 'high'
                ? 'bg-red-900 text-red-300'
                : decision.urgencyTier?.toLowerCase() === 'medium'
                ? 'bg-yellow-900 text-yellow-300'
                : 'bg-blue-900 text-blue-300'
            }`}>
              {decision.urgencyTier}
            </span>
          )}
          <span className="text-white font-semibold">{decision.impactScore}/10 impact</span>
        </div>
        <h1 className="text-2xl font-bold text-white">{decision.title}</h1>
      </div>

      {/* Situation */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="text-gray-300 font-semibold text-sm uppercase tracking-wide mb-2">Situation</h2>
        <p className="text-gray-300 leading-relaxed">{decision.situation}</p>
      </div>

      {/* Impact metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {decision.carbonImpact && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Carbon Impact</p>
            <p className="text-green-400 font-semibold">{decision.carbonImpact}</p>
          </div>
        )}
        {decision.financialImpact && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Financial Impact</p>
            <p className="text-blue-400 font-semibold">{decision.financialImpact}</p>
          </div>
        )}
        {decision.waterImpact && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Water Impact</p>
            <p className="text-cyan-400 font-semibold">{decision.waterImpact}</p>
          </div>
        )}
      </div>

      {/* Effort & timeline */}
      {(decision.effort || decision.timeframe) && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-2 gap-4">
            {decision.effort && (
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Effort</p>
                <p className="text-white">{decision.effort}</p>
              </div>
            )}
            {decision.timeframe && (
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Timeframe</p>
                <p className="text-white">{decision.timeframe}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action steps */}
      {decision.actionSteps?.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
          <h2 className="text-gray-300 font-semibold text-sm uppercase tracking-wide mb-3">Action Steps</h2>
          <ol className="space-y-2">
            {decision.actionSteps.map((step: string, i: number) => (
              <li key={i} className="flex gap-3">
                <span className="text-gray-500 font-mono text-sm shrink-0">{i + 1}.</span>
                <span className="text-gray-300 text-sm">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Risk */}
      {decision.risk && (
        <div className="bg-gray-800 border border-yellow-800 rounded-xl p-5">
          <h2 className="text-yellow-300 font-semibold text-sm uppercase tracking-wide mb-2">Risk</h2>
          <p className="text-gray-300 text-sm">{decision.risk}</p>
        </div>
      )}
    </div>
  )
}
