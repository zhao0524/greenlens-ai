import { createClient } from '@/lib/supabase/server'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import FootprintChart from '@/components/dashboard/FootprintChart'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'

export default async function FootprintPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const { data: report } = await supabase.from('reports').select('*')
    .eq('company_id', company!.id).order('created_at', { ascending: false }).limit(1).single()
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const footprint = report.footprint_detail
  // Synthesis writes carbon_by_model (array of {model, carbonKg, percentage})
  const byModel: { model: string; carbonKg: number; percentage: number }[] = footprint?.carbon_by_model ?? []
  const chartData = byModel.map(m => ({ model: m.model, carbon_kg: m.carbonKg }))

  const savingsKg: number = footprint?.carbon_savings_kg ?? 0

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Carbon &amp; Water Footprint</h1>
        <p className="text-gray-400 mt-1">{company!.name} · {report.reporting_period}</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Carbon</p>
          <p className="text-3xl font-bold text-white mt-1">
            {Math.round(report.carbon_kg ?? 0)} <span className="text-lg text-gray-400">kg</span>
          </p>
          <p className="text-gray-500 text-xs mt-1">CO2 equivalent this period</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Water</p>
          <p className="text-3xl font-bold text-white mt-1">
            {Math.round((report.water_liters ?? 0) / 1000)}k <span className="text-lg text-gray-400">L</span>
          </p>
          <p className="text-gray-500 text-xs mt-1">Direct cooling consumption</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Potential Savings</p>
          <p className="text-3xl font-bold text-green-400 mt-1">
            {savingsKg > 0 ? `${Math.round(savingsKg)} kg` : '—'}
          </p>
          <p className="text-gray-500 text-xs mt-1">if optimal model selection adopted</p>
        </div>
      </div>

      {/* Carbon by model chart */}
      {chartData.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Carbon by Model</h2>
          <FootprintChart data={chartData} />
        </div>
      )}

      {/* By model breakdown table */}
      {byModel.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Breakdown by Model</h2>
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Model</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">Carbon (kg CO2e)</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">Share (%)</th>
                </tr>
              </thead>
              <tbody>
                {byModel.map((m, i) => (
                  <tr key={i} className="border-b border-gray-700 last:border-0">
                    <td className="px-4 py-3 text-white font-mono text-xs">{m.model}</td>
                    <td className="px-4 py-3 text-gray-300 text-right">{m.carbonKg?.toFixed(3)}</td>
                    <td className="px-4 py-3 text-gray-300 text-right">{m.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Water detail */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Water Consumption</p>
          <p className="text-2xl font-bold text-white mt-1">
            {((footprint?.total_water_liters ?? report.water_liters ?? 0) / 1000).toFixed(1)}k L
          </p>
          <p className="text-gray-500 text-xs mt-1">
            ≈ {(footprint?.water_bottles ?? Math.round((report.water_liters ?? 0) / 0.519)).toLocaleString()} 500ml bottles
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Water Savings Potential</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {footprint?.water_savings_liters ? `${(footprint.water_savings_liters / 1000).toFixed(1)}k L` : '—'}
          </p>
          <p className="text-gray-500 text-xs mt-1">if optimal model selection adopted</p>
        </div>
      </div>

      {/* Methodology note */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h3 className="text-gray-300 font-medium mb-2 text-sm">Calculation Methodology</h3>
        <p className="text-gray-500 text-xs leading-relaxed">
          {footprint?.carbon_methodology ??
            'Carbon calculated using model-specific energy intensity (ArXiv 2505.09598), regional grid carbon intensity (EPA eGRID 2024 / IEA 2024), and a PUE of 1.1 for hyperscale data centres. Water consumption uses a WUE of 1.9 L/kWh (The Green Grid benchmark) with regional stress multipliers from the WRI Aqueduct database.'}
        </p>
      </div>
    </div>
  )
}
