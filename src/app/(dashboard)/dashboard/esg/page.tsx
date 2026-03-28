import { createClient } from '@/lib/supabase/server'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import DownloadPDFButton from '@/components/dashboard/ESGExport'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'

export default async function ESGPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('*')
    .eq('supabase_user_id', user!.id).single()
  const { data: report } = await supabase.from('reports').select('*')
    .eq('company_id', company!.id).order('created_at', { ascending: false }).limit(1).single()
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const esg = report?.esg_disclosure

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="border border-gray-700 rounded-2xl p-8 bg-gray-900">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Environmental Disclosure</h1>
            <p className="text-gray-400">{company?.name}</p>
            <p className="text-gray-400">Reporting Period: {esg?.reporting_period ?? report.reporting_period}</p>
          </div>
          <span className="bg-green-900 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
            GreenLens Verified
          </span>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">AI Carbon Footprint</p>
            <p className="text-3xl font-bold text-white mt-1">
              {Math.round(esg?.carbon_kg ?? report.carbon_kg ?? 0)} kg
            </p>
            <p className="text-gray-500 text-sm">CO2 equivalent</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">AI Water Consumption</p>
            <p className="text-3xl font-bold text-white mt-1">
              {Math.round((esg?.water_liters ?? report.water_liters ?? 0) / 1000)}k L
            </p>
            <p className="text-gray-500 text-sm">Direct cooling consumption</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Model Efficiency Score</p>
            <p className="text-3xl font-bold text-white mt-1">
              {esg?.model_efficiency_score ?? report.model_efficiency_score ?? '—'}/100
            </p>
            <p className="text-gray-500 text-sm">vs industry benchmark</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Disclosure Statement</h2>
          <div className="text-gray-300 leading-relaxed whitespace-pre-line">
            {esg?.esg_text ?? 'ESG disclosure text will appear here after analysis is complete.'}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Collection Methodology</h2>
          <div className="bg-gray-800 rounded-xl p-4 space-y-2">
            <p className="text-gray-400 text-sm">
              <span className="text-gray-300 font-medium">Model usage data:</span> Collected via provider
              Usage APIs (OpenAI Usage API, Microsoft Graph Reports API). These APIs return aggregate
              organisational metrics only: model identifiers, token volumes, and request counts.
              No prompt content, completion content, or individual user data is accessible through
              these endpoints.
            </p>
            <p className="text-gray-400 text-sm">
              <span className="text-gray-300 font-medium">License data:</span> Collected via Microsoft
              Graph getMicrosoft365CopilotUsageUserDetail. Returns per-user activity flags (active/inactive)
              for the reporting period. Individual messages or conversations are not exposed.
            </p>
            <p className="text-gray-400 text-sm">
              <span className="text-gray-300 font-medium">Environmental calculations:</span>{' '}
              {esg?.carbon_methodology ?? 'Carbon = (tokens × energy_per_token × PUE) × regional_grid_intensity. PUE=1.1 (hyperscale average). Energy intensity from ArXiv 2505.09598. Grid intensity from EPA eGRID 2024 / IEA 2024.'}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Reporting Framework Alignment</h2>
          <div className="flex gap-3 flex-wrap">
            {(esg?.frameworks ?? ['CSRD', 'GRI 305', 'IFRS S2', 'CDP']).map((f: string) => (
              <span key={f} className="bg-blue-900 text-blue-300 px-3 py-1 rounded-full text-sm">{f}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <DownloadPDFButton />
      </div>
    </div>
  )
}
