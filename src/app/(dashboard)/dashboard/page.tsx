import { createClient } from '@/lib/supabase/server'
import MetricCard from '@/components/dashboard/MetricCard'
import DecisionCard from '@/components/dashboard/DecisionCard'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const { data: report } = await supabase.from('reports').select('*')
    .eq('company_id', company!.id).order('created_at', { ascending: false }).limit(1).single()
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const anomalyDetected = report.anomaly_detected ?? report.stat_analysis?.anomaly_detection?.anomaly_detected ?? false
  const carbonPercentile = report.carbon_percentile ?? report.stat_analysis?.carbon_percentile?.percentile ?? null
  const trendDirection = report.trend_direction ?? report.stat_analysis?.usage_trend?.trend_direction ?? 'stable'
  const mitigationStrategies = report.mitigation_strategies?.strategies
    ?? report.executive_summary?.mitigation_strategies
    ?? []

  const carbonDelta = report.prev_carbon_kg
    ? Math.round(((report.carbon_kg - report.prev_carbon_kg) / report.prev_carbon_kg) * 100) : null
  const scoreDelta = report.prev_model_efficiency_score
    ? report.model_efficiency_score - report.prev_model_efficiency_score : null

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">AI Intelligence Brief</h1>
        <p className="text-gray-400 mt-1">{company!.name} · {report.reporting_period}</p>
      </div>

      {/* Anomaly alert */}
      {anomalyDetected && (
        <div className="bg-yellow-950 border border-yellow-700 rounded-xl p-4 mb-6">
          <p className="text-yellow-300 text-sm font-medium">
            Unusual activity detected this period. Your AI usage spiked significantly above baseline.
            See the model analysis page for details.
          </p>
        </div>
      )}

      {/* Top line metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard label="Monthly AI Carbon" value={`${Math.round(report.carbon_kg ?? 0)} kg`}
          unit="CO2e" delta={carbonDelta} />
        <MetricCard label="Monthly AI Water"
          value={`${Math.round((report.water_liters ?? 0) / 1000)}k L`}
          unit={`~${Math.round((report.executive_summary?.water_bottles ?? 0) / 1000)}k bottles`} />
        <MetricCard label="Model Efficiency" value={`${report.model_efficiency_score ?? '—'}/100`}
          delta={scoreDelta}
          status={(report.model_efficiency_score ?? 0) > 60 ? 'good' : 'warning'} />
        <MetricCard label="License Utilization"
          value={`${Math.round(report.license_utilization_rate ?? 0)}%`}
          status={(report.license_utilization_rate ?? 0) > 75 ? 'good' : 'warning'} />
      </div>

      {/* Sector percentile + trend */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Sector Position</p>
          <p className="text-white font-semibold">
            {carbonPercentile != null ? `${carbonPercentile.toFixed(0)}th percentile for carbon intensity` : 'Sector percentile unavailable'}
          </p>
          <p className="text-gray-400 text-sm">{report.benchmark_data?.carbon_percentile?.relative_position}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Usage Trend</p>
          <p className="text-white font-semibold capitalize">{trendDirection}</p>
          <p className="text-gray-400 text-sm">
            Projected 30-day: {report.stat_analysis?.usage_trend?.projected_30d_requests?.toLocaleString()} requests
          </p>
        </div>
      </div>

      {/* Executive narrative */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-8">
        <p className="text-gray-300 leading-relaxed">{report.executive_summary?.narrative}</p>
        {report.executive_summary?.hype_cycle_context && (
          <p className="text-gray-400 text-sm mt-3 pt-3 border-t border-gray-700">
            {report.executive_summary.hype_cycle_context}
          </p>
        )}
      </div>

      {/* Decisions */}
      <h2 className="text-xl font-semibold text-white mb-4">Decisions This Quarter</h2>
      <div className="space-y-4 mb-8">
        {report.strategic_decisions?.decisions
          ?.sort((a: { impactScore: number }, b: { impactScore: number }) => b.impactScore - a.impactScore)
          .slice(0, 3)
          .map((decision: { title: string; situation: string; impactScore: number; urgencyTier: string; carbonImpact?: string; financialImpact?: string; effort?: string }, i: number) => (
            <DecisionCard key={i} decision={decision} index={i + 1} />
          ))}
      </div>

      {/* Mitigation strategies if score is low */}
      {report.model_efficiency_score < 60 && (
        <>
          <h2 className="text-xl font-semibold text-white mb-4">
            Improving Your Score ({report.model_efficiency_score}/100)
          </h2>
          <div className="space-y-3 mb-8">
            {mitigationStrategies.map((s: { strategy: string; description: string; expectedScoreImprovement: string; timeframe: string }, i: number) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-medium">{s.strategy}</p>
                    <p className="text-gray-400 text-sm mt-1">{s.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-green-400 text-sm font-medium">{s.expectedScoreImprovement}</span>
                    <p className="text-gray-500 text-xs">{s.timeframe}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Incentives teaser */}
      {report.incentives_and_benefits?.incentives?.length > 0 && (
        <div className="bg-blue-950 border border-blue-800 rounded-xl p-4">
          <p className="text-blue-300 text-sm font-medium mb-1">Financial and Regulatory Incentives Available</p>
          <p className="text-blue-400 text-sm">
            Based on your organization&apos;s profile and regions, {report.incentives_and_benefits.incentives.length} incentives
            or compliance obligations are relevant to your AI usage. View the full incentives report.
          </p>
        </div>
      )}
    </div>
  )
}
