import { createClient } from '@/lib/supabase/server'

export async function runSynthesis(
  jobId: string, companyId: string,
  outputs: { usage: any, carbonWater: any, license: any, translator: any, statAnalysis: any }
) {
  const supabase = await createClient()

  const { data: prevReport } = await supabase.from('reports').select('carbon_kg, water_liters, model_efficiency_score')
    .eq('company_id', companyId).order('created_at', { ascending: false }).limit(1).single()

  const reportingPeriod = new Date().toISOString().slice(0, 7)

  const { data: report, error } = await supabase.from('reports').insert({
    company_id: companyId, job_id: jobId, reporting_period: reportingPeriod,

    carbon_kg: outputs.carbonWater.totalCarbonKg,
    water_liters: outputs.carbonWater.totalWaterLiters,
    model_efficiency_score: outputs.carbonWater.modelEfficiencyScore,
    license_utilization_rate: outputs.license.overallUtilizationRate,

    // Stat analysis top-level fields for quick dashboard access
    anomaly_detected: outputs.statAnalysis?.anomaly_detection?.anomaly_detected || false,
    trend_direction: outputs.statAnalysis?.usage_trend?.trend_direction || 'stable',
    carbon_percentile: outputs.statAnalysis?.carbon_percentile?.percentile || null,

    prev_carbon_kg: prevReport?.carbon_kg || null,
    prev_water_liters: prevReport?.water_liters || null,
    prev_model_efficiency_score: prevReport?.model_efficiency_score || null,

    executive_summary: {
      carbon_kg: outputs.carbonWater.totalCarbonKg,
      water_liters: outputs.carbonWater.totalWaterLiters,
      water_bottles: outputs.carbonWater.totalWaterBottles,
      model_efficiency_score: outputs.carbonWater.modelEfficiencyScore,
      license_utilization_rate: outputs.license.overallUtilizationRate,
      frontier_model_percentage: outputs.usage.frontierModelPercentage,
      carbon_percentile: outputs.statAnalysis?.carbon_percentile?.percentile,
      trend_direction: outputs.statAnalysis?.usage_trend?.trend_direction,
      anomaly_detected: outputs.statAnalysis?.anomaly_detection?.anomaly_detected,
      narrative: outputs.translator.executiveNarrative,
      hype_cycle_context: outputs.translator.hypeCycleContext,
      decisions_preview: outputs.translator.decisions?.slice(0, 3)
    },

    footprint_detail: {
      carbon_by_model: outputs.carbonWater.carbonByModel,
      total_carbon_kg: outputs.carbonWater.totalCarbonKg,
      alternative_carbon_kg: outputs.carbonWater.alternativeCarbonKg,
      carbon_savings_kg: outputs.carbonWater.carbonSavingsKg,
      total_water_liters: outputs.carbonWater.totalWaterLiters,
      water_bottles: outputs.carbonWater.totalWaterBottles,
      water_savings_liters: outputs.carbonWater.waterSavingsLiters,
      carbon_methodology: outputs.carbonWater.carbonMethodology,
      water_methodology: outputs.carbonWater.waterMethodology
    },

    model_efficiency_analysis: {
      model_inventory: outputs.usage.normalizedUsage,
      task_clustering: outputs.statAnalysis?.task_clustering,
      efficiency_score: outputs.carbonWater.modelEfficiencyScore,
      mismatch_rate: outputs.carbonWater.modelTaskMismatchRate,
      mismatched_clusters: outputs.carbonWater.mismatchedModelClusters,
      frontier_percentage: outputs.usage.frontierModelPercentage
    },

    stat_analysis: {
      anomaly_detection: outputs.statAnalysis?.anomaly_detection,
      usage_trend: outputs.statAnalysis?.usage_trend,
      carbon_percentile: outputs.statAnalysis?.carbon_percentile,
      task_clustering_summary: outputs.statAnalysis?.task_clustering
    },

    license_intelligence: outputs.license,

    strategic_decisions: {
      decisions: outputs.translator.decisions,
      executive_narrative: outputs.translator.executiveNarrative
    },

    incentives_and_benefits: {
      incentives: outputs.translator.incentivesAndBenefits,
      note: 'Sourced from GreenLens incentives library. Verify current terms with relevant regulatory bodies.'
    },

    mitigation_strategies: {
      strategies: outputs.translator.mitigationStrategies,
      current_score: outputs.carbonWater.modelEfficiencyScore
    },

    benchmark_data: {
      carbon_percentile: outputs.statAnalysis?.carbon_percentile,
      hype_cycle_context: outputs.translator.hypeCycleContext
    },

    esg_disclosure: {
      reporting_period: reportingPeriod,
      carbon_kg: outputs.carbonWater.totalCarbonKg,
      water_liters: outputs.carbonWater.totalWaterLiters,
      model_efficiency_score: outputs.carbonWater.modelEfficiencyScore,
      esg_text: outputs.translator.esgDisclosureText,
      carbon_methodology: outputs.carbonWater.carbonMethodology,
      water_methodology: outputs.carbonWater.waterMethodology,
      frameworks: ['CSRD', 'GRI 305', 'IFRS S2', 'CDP']
    }
  }).select().single()

  if (error) throw new Error(`Synthesis failed: ${error.message}`)
  return report!.id
}
