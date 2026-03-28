import { createAdminClient } from '@/lib/supabase/admin'

interface SynthesisOutputs {
  usage: {
    frontierModelPercentage?: number
    normalizedUsage?: unknown[]
  }
  carbonWater: {
    totalCarbonKg?: number
    totalWaterLiters?: number
    modelEfficiencyScore?: number
    totalWaterBottles?: number
    carbonByModel?: unknown[]
    alternativeCarbonKg?: number
    carbonSavingsKg?: number
    waterSavingsLiters?: number
    carbonMethodology?: string
    waterMethodology?: string
    modelTaskMismatchRate?: number
    mismatchedModelClusters?: unknown[]
  }
  license: {
    overallUtilizationRate?: number
  } & Record<string, unknown>
  translator: {
    executiveNarrative?: string
    hypeCycleContext?: string
    decisions?: unknown[]
    incentivesAndBenefits?: unknown[]
    mitigationStrategies?: unknown[]
    esgDisclosureText?: string
  }
  statAnalysis: {
    anomaly_detection?: {
      anomaly_detected?: boolean
    } & Record<string, unknown>
    usage_trend?: {
      trend_direction?: string
    } & Record<string, unknown>
    carbon_percentile?: {
      percentile?: number | null
    } & Record<string, unknown>
    task_clustering?: unknown
  }
}

function parseMissingReportsColumn(message: string) {
  const match = message.match(/Could not find the '([^']+)' column of 'reports'/)
  return match?.[1] ?? null
}

async function insertReportWithFallback(
  supabase: ReturnType<typeof createAdminClient>,
  payload: Record<string, unknown>
) {
  const nextPayload = { ...payload }
  const strippedColumns: string[] = []
  let attempts = 0

  while (true) {
    if (++attempts > 20) {
      throw new Error(`Synthesis failed: exceeded 20 insert attempts. Stripped columns: ${strippedColumns.join(', ')}`)
    }
    const { data: report, error } = await supabase.from('reports').insert(nextPayload).select().single()

    if (!error) {
      if (strippedColumns.length > 0) {
        console.warn('Reports schema is missing columns; inserted report without:', strippedColumns.join(', '))
      }
      return report
    }

    const missingColumn = parseMissingReportsColumn(error.message)
    if (!missingColumn || !(missingColumn in nextPayload)) {
      throw new Error(`Synthesis failed: ${error.message}`)
    }

    delete nextPayload[missingColumn]
    strippedColumns.push(missingColumn)
  }
}

export async function runSynthesis(
  jobId: string, companyId: string,
  outputs: SynthesisOutputs
) {
  const supabase = createAdminClient()

  const { data: prevReport } = await supabase.from('reports').select('carbon_kg, water_liters, model_efficiency_score')
    .eq('company_id', companyId).order('created_at', { ascending: false }).limit(1).maybeSingle()

  const reportingPeriod = new Date().toISOString().slice(0, 7)

  const reportPayload: Record<string, unknown> = {
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
      decisions_preview: outputs.translator.decisions?.slice(0, 3),
      mitigation_strategies: outputs.translator.mitigationStrategies,
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
  }

  const report = await insertReportWithFallback(supabase, reportPayload)
  return report.id
}
