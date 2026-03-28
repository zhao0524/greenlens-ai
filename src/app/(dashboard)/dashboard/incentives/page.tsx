import { createClient } from '@/lib/supabase/server'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import IncentiveCard from '@/components/dashboard/IncentiveCard'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'

export default async function IncentivesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const { data: report } = await supabase.from('reports').select('*')
    .eq('company_id', company!.id).order('created_at', { ascending: false }).limit(1).single()
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const incentives: { title: string; description: string; region: string; estimated_value: string; action_required?: string }[] =
    report.incentives_and_benefits?.incentives ?? []

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Financial &amp; Regulatory Incentives</h1>
        <p className="text-gray-400 mt-1">
          {company!.name} · {incentives.length} applicable incentives identified
        </p>
      </div>

      {incentives.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <p className="text-gray-400">No incentives identified for your organisation profile yet.</p>
          <p className="text-gray-500 text-sm mt-2">
            Make sure your industry, regions, and ESG obligations are set correctly in onboarding.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-blue-950 border border-blue-800 rounded-xl p-4 mb-6">
            <p className="text-blue-300 text-sm font-medium mb-1">Why this matters</p>
            <p className="text-blue-400 text-sm">
              These incentives are matched to your organisation&apos;s industry, regional presence, and ESG obligations.
              Regulatory requirements carry deadlines — non-compliance can result in penalties. Financial incentives
              include tax credits, grants, and certification benefits.
            </p>
          </div>

          <div className="space-y-4">
            {incentives.map((incentive, i) => (
              <IncentiveCard key={i} {...incentive} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
