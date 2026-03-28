import { createClient } from '@/lib/supabase/server'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'

export default async function BenchmarkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name, industry')
    .eq('supabase_user_id', user!.id).single()
  const { data: report } = await supabase.from('reports').select('*')
    .eq('company_id', company!.id).order('created_at', { ascending: false }).limit(1).single()
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const benchmark = report.benchmark_data
  const stat = report.stat_analysis
  const carbonPercentile = report.carbon_percentile ?? stat?.carbon_percentile?.percentile ?? 0
  const anomalyDetected = report.anomaly_detected ?? stat?.anomaly_detection?.anomaly_detected ?? false
  const trendDirection = report.trend_direction ?? stat?.usage_trend?.trend_direction ?? 'stable'

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Industry Benchmark</h1>
        <p className="text-gray-400 mt-1">{company!.name} · {company!.industry?.replace(/_/g, ' ')}</p>
      </div>

      {/* Percentile cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-1">Carbon Intensity Percentile</p>
          <div className="flex items-end gap-2">
            <p className="text-5xl font-bold text-white">{carbonPercentile.toFixed(0)}</p>
            <p className="text-gray-400 text-xl mb-1">th</p>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            {benchmark?.carbon_percentile?.relative_position ?? stat?.carbon_percentile?.relative_position ?? '—'}
          </p>
          <div className="mt-4 bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${Math.min(100, carbonPercentile)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Lowest carbon</span>
            <span>Highest carbon</span>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-1">Usage Trend</p>
          <p className="text-3xl font-bold text-white capitalize mt-1">
            {trendDirection}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Slope: {stat?.usage_trend?.slope?.toFixed(1) ?? '—'} requests/day
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Projected 30-day total: {stat?.usage_trend?.projected_30d_requests?.toLocaleString() ?? '—'} requests
          </p>
          {stat?.usage_trend?.trend_significant === false && (
            <p className="text-gray-500 text-xs mt-2">Trend not statistically significant (p={stat?.usage_trend?.p_value?.toFixed(2)})</p>
          )}
        </div>
      </div>

      {/* Hype cycle context */}
      {report.executive_summary?.hype_cycle_context && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Gartner Hype Cycle Context</h2>
          <p className="text-gray-300 leading-relaxed">{report.executive_summary.hype_cycle_context}</p>
        </div>
      )}

      {/* Stat analysis detail */}
      {stat?.carbon_percentile && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Industry Context</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-xs">Sector median carbon (kg/month)</p>
              <p className="text-white font-semibold">{stat.carbon_percentile.industry_mean_kg?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Your carbon this period</p>
              <p className="text-white font-semibold">{Math.round(report.carbon_kg ?? 0).toLocaleString()} kg</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Sector std deviation</p>
              <p className="text-white font-semibold">±{stat.carbon_percentile.industry_std_kg?.toLocaleString()} kg</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Relative position</p>
              <p className="text-white font-semibold">{stat.carbon_percentile.relative_position}</p>
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-3">{stat.carbon_percentile.method}</p>
        </div>
      )}

      {/* Anomaly detection */}
      {stat?.anomaly_detection && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Usage Anomaly Analysis</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-gray-400 text-xs">Anomaly detected</p>
              <p className={`font-semibold ${anomalyDetected ? 'text-yellow-400' : 'text-green-400'}`}>
                {anomalyDetected ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Mean daily requests</p>
              <p className="text-white font-semibold">
                {stat.anomaly_detection.mean_daily_requests?.toLocaleString() ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Max Z-score</p>
              <p className="text-white font-semibold">{stat.anomaly_detection.max_z_score ?? '—'}</p>
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-3">{stat.anomaly_detection.method}</p>
        </div>
      )}
    </div>
  )
}
