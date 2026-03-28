import { createClient } from '@/lib/supabase/server'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import DecisionCard from '@/components/dashboard/DecisionCard'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'

export default async function DecisionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const { data: report } = await supabase.from('reports').select('*')
    .eq('company_id', company!.id).order('created_at', { ascending: false }).limit(1).single()
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const decisions: { title: string; situation: string; impactScore: number; urgencyTier: string; carbonImpact?: string; financialImpact?: string; effort?: string }[] =
    report.strategic_decisions?.decisions
      ?.sort((a: { impactScore: number }, b: { impactScore: number }) => b.impactScore - a.impactScore) ?? []

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Strategic Decisions</h1>
        <p className="text-gray-400 mt-1">
          {company!.name} · {decisions.length} recommendation{decisions.length !== 1 ? 's' : ''} this quarter
        </p>
      </div>

      {decisions.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <p className="text-gray-400">No strategic decisions generated yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map((decision, i) => (
            <DecisionCard key={i} decision={decision} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
