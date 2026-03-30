import { createAdminClient } from '@/lib/supabase/admin'
import type { StatAnalysisResult } from '@/lib/analysis/run-stat-analysis'
import type {
  DataFreshness,
  ProviderAnalysisStatus,
  ReportMode,
  ReportSection,
  SectionAvailability,
} from '@/lib/analysis/provider-status'
import type { LicenseIntelligenceResult } from './license-intelligence'

type ReportStatAnalysis = Partial<StatAnalysisResult> & {
  error?: string
  unavailable?: true
  message?: string
}

interface SynthesisOutputs {
  usage: {
    frontierModelPercentage?: number
    normalizedUsage?: unknown[]
    coverageStart?: string | null
    coverageEnd?: string | null
    latestCompleteDay?: string | null
    asOf?: string | null
    providerStatus?: ProviderAnalysisStatus[]
    availability?: SectionAvailability
  }
  carbonWater: {
    totalCarbonKg?: number | null
    totalWaterLiters?: number | null
    modelEfficiencyScore?: number | null
    totalWaterBottles?: number | null
    carbonByModel?: unknown[]
    alternativeCarbonKg?: number | null
    carbonSavingsKg?: number | null
    waterSavingsLiters?: number | null
    carbonMethodology?: string | null
    waterMethodology?: string | null
    modelTaskMismatchRate?: number | null
    mismatchedModelClusters?: unknown[]
    unavailableReason?: string | null
  }
  license: Omit<LicenseIntelligenceResult, 'overallUtilizationRate' | 'providerStatus'> & {
    overallUtilizationRate?: number | null
    providerStatus?: ProviderAnalysisStatus[]
  }
  translator: {
    executiveNarrative?: string
    hypeCycleContext?: string
    decisions?: unknown[]
    incentivesAndBenefits?: unknown[]
    mitigationStrategies?: unknown[]
    esgDisclosureText?: string
  }
  statAnalysis: ReportStatAnalysis
  meta: {
    reportMode: ReportMode
    sectionAvailability: Record<ReportSection, SectionAvailability>
    dataFreshness: DataFreshness
    providerStatuses: ProviderAnalysisStatus[]
  }
}

interface PreviousReportSummary {
  carbon_kg?: number | null
  water_liters?: number | null
  model_efficiency_score?: number | null
}

function parseMissingReportsColumn(message: string) {
  const match = message.match(/Could not find the '([^']+)' column of 'reports'/)
  return match?.[1] ?? null
}

export async function upsertReportWithFallback(
  supabase: ReturnType<typeof createAdminClient>,
  payload: Record<string, unknown>
) {
  const nextPayload = { ...payload }
  const strippedColumns: string[] = []
  let attempts = 0

  while (true) {
    if (++attempts > 20) {
      throw new Error(`Synthesis failed: exceeded 20 upsert attempts. Stripped columns: ${strippedColumns.join(', ')}`)
    }
    const { data: report, error } = await supabase
      .from('reports')
      .upsert(nextPayload, { onConflict: 'job_id' })
      .select()
      .single()

    if (!error) {
      if (strippedColumns.length > 0) {
        console.warn('Reports schema is missing columns; upserted report without:', strippedColumns.join(', '))
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

export function buildReportPayload(
  jobId: string,
  companyId: string,
  outputs: SynthesisOutputs,
  prevReport: PreviousReportSummary | null,
  reportingPeriod: string
) {
  const usageAvailable = outputs.meta.sectionAvailability.usage.status === 'available'
  const carbonWaterAvailable = outputs.meta.sectionAvailability.carbon_water.status === 'available'
  const modelEfficiencyAvailable = outputs.meta.sectionAvailability.model_efficiency.status === 'available'
  const benchmarkAvailable = outputs.meta.sectionAvailability.benchmark.status === 'available'
  const esgAvailable = outputs.meta.sectionAvailability.esg.status === 'available'
  const licenseAvailable = outputs.meta.sectionAvailability.license.status === 'available'
  const statAnalysisPayload = outputs.statAnalysis?.unavailable
    ? {
        unavailable: true,
        message: outputs.statAnalysis.message ?? null,
      }
    : {
        anomaly_detection: benchmarkAvailable ? outputs.statAnalysis?.anomaly_detection ?? null : null,
        usage_trend: benchmarkAvailable ? outputs.statAnalysis?.usage_trend ?? null : null,
        carbon_percentile: benchmarkAvailable ? outputs.statAnalysis?.carbon_percentile ?? null : null,
        task_clustering_summary: usageAvailable ? outputs.statAnalysis?.task_clustering ?? null : null,
        error: outputs.statAnalysis?.error ?? null,
      }

  return {
    company_id: companyId, job_id: jobId, reporting_period: reportingPeriod,

    report_mode: outputs.meta.reportMode,
    section_availability: outputs.meta.sectionAvailability,
    carbon_kg: carbonWaterAvailable ? outputs.carbonWater.totalCarbonKg ?? null : null,
    water_liters: carbonWaterAvailable ? outputs.carbonWater.totalWaterLiters ?? null : null,
    model_efficiency_score: modelEfficiencyAvailable ? outputs.carbonWater.modelEfficiencyScore ?? null : null,
    license_utilization_rate: licenseAvailable ? outputs.license.overallUtilizationRate ?? null : null,

    // Stat analysis top-level fields for quick dashboard access
    anomaly_detected: benchmarkAvailable
      ? outputs.statAnalysis?.anomaly_detection?.anomaly_detected ?? null
      : null,
    trend_direction: benchmarkAvailable
      ? outputs.statAnalysis?.usage_trend?.trend_direction ?? null
      : null,
    carbon_percentile: benchmarkAvailable
      ? outputs.statAnalysis?.carbon_percentile?.percentile ?? null
      : null,

    prev_carbon_kg: prevReport?.carbon_kg ?? null,
    prev_water_liters: prevReport?.water_liters ?? null,
    prev_model_efficiency_score: prevReport?.model_efficiency_score ?? null,

    executive_summary: {
      report_mode: outputs.meta.reportMode,
      section_availability: outputs.meta.sectionAvailability,
      carbon_kg: carbonWaterAvailable ? outputs.carbonWater.totalCarbonKg ?? null : null,
      water_liters: carbonWaterAvailable ? outputs.carbonWater.totalWaterLiters ?? null : null,
      water_bottles: carbonWaterAvailable ? outputs.carbonWater.totalWaterBottles ?? null : null,
      model_efficiency_score: modelEfficiencyAvailable ? outputs.carbonWater.modelEfficiencyScore ?? null : null,
      license_utilization_rate: licenseAvailable ? outputs.license.overallUtilizationRate ?? null : null,
      frontier_model_percentage: usageAvailable ? outputs.usage.frontierModelPercentage ?? null : null,
      carbon_percentile: benchmarkAvailable ? outputs.statAnalysis?.carbon_percentile?.percentile ?? null : null,
      trend_direction: benchmarkAvailable ? outputs.statAnalysis?.usage_trend?.trend_direction ?? null : null,
      anomaly_detected: benchmarkAvailable ? outputs.statAnalysis?.anomaly_detection?.anomaly_detected ?? null : null,
      narrative: outputs.translator.executiveNarrative,
      hype_cycle_context: outputs.translator.hypeCycleContext,
      decisions_preview: outputs.translator.decisions?.slice(0, 3),
      mitigation_strategies: outputs.translator.mitigationStrategies,
      data_freshness: outputs.meta.dataFreshness,
      provider_statuses: outputs.meta.providerStatuses,
    },

    footprint_detail: {
      section_availability: outputs.meta.sectionAvailability,
      carbon_by_model: carbonWaterAvailable ? outputs.carbonWater.carbonByModel ?? [] : [],
      total_carbon_kg: carbonWaterAvailable ? outputs.carbonWater.totalCarbonKg ?? null : null,
      alternative_carbon_kg: carbonWaterAvailable ? outputs.carbonWater.alternativeCarbonKg ?? null : null,
      carbon_savings_kg: carbonWaterAvailable ? outputs.carbonWater.carbonSavingsKg ?? null : null,
      total_water_liters: carbonWaterAvailable ? outputs.carbonWater.totalWaterLiters ?? null : null,
      water_bottles: carbonWaterAvailable ? outputs.carbonWater.totalWaterBottles ?? null : null,
      water_savings_liters: carbonWaterAvailable ? outputs.carbonWater.waterSavingsLiters ?? null : null,
      carbon_methodology: carbonWaterAvailable ? outputs.carbonWater.carbonMethodology ?? null : null,
      water_methodology: carbonWaterAvailable ? outputs.carbonWater.waterMethodology ?? null : null,
      data_freshness: outputs.meta.dataFreshness,
      unavailable_reason: carbonWaterAvailable ? null : outputs.meta.sectionAvailability.carbon_water.message,
    },

    model_efficiency_analysis: {
      section_availability: outputs.meta.sectionAvailability,
      model_inventory: usageAvailable ? outputs.usage.normalizedUsage ?? [] : [],
      task_clustering: usageAvailable ? outputs.statAnalysis?.task_clustering ?? null : null,
      efficiency_score: modelEfficiencyAvailable ? outputs.carbonWater.modelEfficiencyScore ?? null : null,
      mismatch_rate: modelEfficiencyAvailable ? outputs.carbonWater.modelTaskMismatchRate ?? null : null,
      mismatched_clusters: modelEfficiencyAvailable ? outputs.carbonWater.mismatchedModelClusters ?? [] : [],
      frontier_percentage: usageAvailable ? outputs.usage.frontierModelPercentage ?? null : null,
      data_freshness: outputs.meta.dataFreshness,
      provider_statuses: outputs.meta.providerStatuses,
      unavailable_reason: modelEfficiencyAvailable ? null : outputs.meta.sectionAvailability.model_efficiency.message,
    },

    stat_analysis: statAnalysisPayload,

    license_intelligence: {
      ...outputs.license,
      section_availability: outputs.meta.sectionAvailability,
      provider_statuses: outputs.meta.providerStatuses,
    },

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
      current_score: modelEfficiencyAvailable ? outputs.carbonWater.modelEfficiencyScore ?? null : null
    },

    benchmark_data: {
      section_availability: outputs.meta.sectionAvailability,
      carbon_percentile: benchmarkAvailable ? outputs.statAnalysis?.carbon_percentile ?? null : null,
      hype_cycle_context: outputs.translator.hypeCycleContext,
      data_freshness: outputs.meta.dataFreshness,
      provider_statuses: outputs.meta.providerStatuses,
      unavailable_reason: benchmarkAvailable ? null : outputs.meta.sectionAvailability.benchmark.message,
    },

    esg_disclosure: {
      reporting_period: reportingPeriod,
      section_availability: outputs.meta.sectionAvailability,
      carbon_kg: esgAvailable ? outputs.carbonWater.totalCarbonKg ?? null : null,
      water_liters: esgAvailable ? outputs.carbonWater.totalWaterLiters ?? null : null,
      model_efficiency_score: esgAvailable ? outputs.carbonWater.modelEfficiencyScore ?? null : null,
      esg_text: outputs.translator.esgDisclosureText,
      carbon_methodology: esgAvailable ? outputs.carbonWater.carbonMethodology ?? null : null,
      water_methodology: esgAvailable ? outputs.carbonWater.waterMethodology ?? null : null,
      unavailable_reason: esgAvailable ? null : outputs.meta.sectionAvailability.esg.message,
      frameworks: ['CSRD', 'GRI 305', 'IFRS S2', 'CDP']
    }
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
  const reportPayload = buildReportPayload(
    jobId,
    companyId,
    outputs,
    (prevReport ?? null) as PreviousReportSummary | null,
    reportingPeriod
  )

  const report = await upsertReportWithFallback(supabase, reportPayload)
  return report.id
}
