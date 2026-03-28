import { createClient } from '@/lib/supabase/server'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import MitigationCard from '@/components/dashboard/MitigationCard'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'

const clusterLabels: Record<string, { label: string; color: string; description: string }> = {
  classification_routing: {
    label: 'Classification & Routing',
    color: 'bg-blue-900 text-blue-300',
    description: 'High volume, low tokens — small models appropriate',
  },
  generation_drafting: {
    label: 'Generation & Drafting',
    color: 'bg-purple-900 text-purple-300',
    description: 'Medium volume, medium tokens — mid-tier models',
  },
  analysis_reasoning: {
    label: 'Analysis & Reasoning',
    color: 'bg-orange-900 text-orange-300',
    description: 'Low volume, high tokens — frontier models justified',
  },
}

export default async function ModelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const { data: report } = await supabase.from('reports').select('*')
    .eq('company_id', company!.id).order('created_at', { ascending: false }).limit(1).single()
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const modelAnalysis = report.model_efficiency_analysis
  const statAnalysis = report.stat_analysis
  const anomalyDetected = report.anomaly_detected ?? statAnalysis?.anomaly_detection?.anomaly_detected ?? false
  const mitigationStrategies = report.mitigation_strategies?.strategies
    ?? report.executive_summary?.mitigation_strategies
    ?? []

  // model_inventory is an array of NormalizedUsage objects from the usage analyst
  const modelInventory: {
    model: string; provider: string; totalInputTokens: number;
    totalOutputTokens: number; totalRequests: number; behaviorCluster: string
  }[] = modelAnalysis?.model_inventory ?? []

  // task_clustering comes from the stat analysis module
  const taskClusters: { model: string; task_category: string; appropriate_model_class: string }[] =
    modelAnalysis?.task_clustering?.clusters ?? []

  // Group clusters for the card display
  const clusterCounts = taskClusters.reduce((acc, c) => {
    acc[c.task_category] = (acc[c.task_category] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const anomalyIndices: number[] = statAnalysis?.anomaly_detection?.anomaly_day_indices ?? []
  const mismatchRate: number = modelAnalysis?.mismatch_rate ?? 0

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Model Efficiency</h1>
        <p className="text-gray-400 mt-1">{company!.name} · {report.reporting_period}</p>
      </div>

      {/* Efficiency score */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Efficiency Score</p>
          <p className="text-3xl font-bold text-white mt-1">
            {report.model_efficiency_score ?? '—'}
            <span className="text-gray-500 text-lg">/100</span>
          </p>
          <p className="text-gray-500 text-xs mt-1">Weighted model fitness score</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Frontier Model Usage</p>
          <p className="text-3xl font-bold text-white mt-1">
            {modelAnalysis?.frontier_percentage != null
              ? `${Math.round(modelAnalysis.frontier_percentage)}%`
              : '—'}
          </p>
          <p className="text-gray-500 text-xs mt-1">of requests use frontier models</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Anomaly Status</p>
          <p className={`text-lg font-bold mt-1 ${anomalyDetected ? 'text-yellow-400' : 'text-green-400'}`}>
            {anomalyDetected ? 'Spike detected' : 'Normal'}
          </p>
          {anomalyIndices.length > 0 && (
            <p className="text-gray-500 text-xs mt-1">
              Day{anomalyIndices.length > 1 ? 's' : ''} {anomalyIndices.slice(0, 3).join(', ')} of period
            </p>
          )}
        </div>
      </div>

      {/* Model-task mismatch */}
      {mismatchRate > 0 && (
        <div className="bg-yellow-950 border border-yellow-700 rounded-xl p-4 mb-8">
          <p className="text-yellow-300 text-sm font-medium">
            {mismatchRate}% of requests use high-capability models for tasks that do not require them.
          </p>
          {modelAnalysis?.mismatched_clusters?.map((c: { model: string; taskCategory: string; suggestedAlternative: string }, i: number) => (
            <p key={i} className="text-yellow-400 text-xs mt-1">
              {c.model} → consider {c.suggestedAlternative} for {c.taskCategory.replace('_', ' ')} tasks
            </p>
          ))}
        </div>
      )}

      {/* Task clusters */}
      {taskClusters.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Task Clustering</h2>
          <p className="text-gray-400 text-sm mb-4">
            GreenLens classifies your usage patterns into task types to identify model-task mismatches.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(clusterCounts).map(([cluster, count]) => {
              const info = clusterLabels[cluster] ?? { label: cluster, color: 'bg-gray-700 text-gray-300', description: '' }
              const clusterModels = taskClusters.filter(c => c.task_category === cluster).map(c => c.model)
              return (
                <div key={cluster} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>
                    {info.label}
                  </span>
                  <p className="text-white font-semibold text-lg mt-2">{count} model{count !== 1 ? 's' : ''}</p>
                  <p className="text-gray-400 text-xs mt-2">{info.description}</p>
                  {clusterModels.length > 0 && (
                    <p className="text-gray-500 text-xs mt-2 font-mono truncate">
                      {clusterModels.slice(0, 2).join(', ')}
                      {clusterModels.length > 2 ? ` +${clusterModels.length - 2}` : ''}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Model inventory */}
      {modelInventory.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Model Inventory</h2>
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Model</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Provider</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">Requests</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">Tokens (in/out)</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Behavior</th>
                </tr>
              </thead>
              <tbody>
                {modelInventory.map((m, i) => (
                  <tr key={i} className="border-b border-gray-700 last:border-0">
                    <td className="px-4 py-3 text-white font-mono text-xs">{m.model}</td>
                    <td className="px-4 py-3 text-gray-400">{m.provider}</td>
                    <td className="px-4 py-3 text-gray-300 text-right">{m.totalRequests?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-300 text-right text-xs">
                      {m.totalInputTokens?.toLocaleString()} / {m.totalOutputTokens?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">{m.behaviorCluster?.replace(/_/g, ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mitigation strategies */}
      {(report.model_efficiency_score ?? 100) < 60 && mitigationStrategies.length > 0 && (
        <>
          <h2 className="text-xl font-semibold text-white mb-4">Improvement Strategies</h2>
          <div className="space-y-3">
            {mitigationStrategies.map((s: {
              strategy: string; description: string; expectedScoreImprovement: string; effort: string; timeframe: string
            }, i: number) => (
              <MitigationCard key={i} {...s} />
            ))}
          </div>
        </>
      )}

      {modelInventory.length === 0 && taskClusters.length === 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <p className="text-gray-400">No model usage data available.</p>
          <p className="text-gray-500 text-sm mt-2">Connect an OpenAI integration and run analysis to see model efficiency.</p>
        </div>
      )}
    </div>
  )
}
