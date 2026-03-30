import { createAdminClient } from '@/lib/supabase/admin'
import { findBestEnergyProfileMatch } from '@/lib/analysis/model-classification'

interface UsageRecord {
  model: string
  provider: string
  totalInputTokens: number
  totalOutputTokens: number
  region?: string
}

interface EnergyLibraryRecord {
  model_identifier: string
  provider: string | null
  model_class: string
  energy_wh_per_1k_input_tokens: number
  energy_wh_per_1k_output_tokens: number
  relative_efficiency_score: number
}

interface RegionalIntensityRecord {
  provider: string | null
  region_identifier: string
  carbon_intensity_gco2_per_kwh: number
  water_usage_effectiveness: number
  water_stress_multiplier: number
}

export async function calculateCarbon(usageData: UsageRecord[]) {
  if (usageData.length === 0) {
    return {
      totalCarbonKg: 0,
      byModel: [] as Array<{ model: string, carbonKg: number, percentage: number }>,
      alternativeCarbonKg: 0,
      savingsKg: 0,
      savingsPercentage: 0,
      modelEfficiencyScore: null as number | null,
      methodology: `Carbon = (tokens x energy_per_token x PUE) x regional_grid_intensity. ` +
        `PUE=1.1 (hyperscale average). Energy intensity from ArXiv 2505.09598. ` +
        `Grid intensity from EPA eGRID 2024 / IEA 2024.`
    }
  }

  const supabase = createAdminClient()
  // Run both table reads in parallel — they're independent and sequential was
  // the primary hang point when Supabase was slow.
  const [{ data: energyLibrary }, { data: regionalData }] = await Promise.all([
    supabase.from('model_energy_library').select('*'),
    supabase.from('regional_carbon_intensity').select('*'),
  ])

  const energyRecords = (energyLibrary ?? []) as EnergyLibraryRecord[]
  const regionRecords = (regionalData ?? []) as RegionalIntensityRecord[]

  let totalCarbonGrams = 0
  let alternativeCarbonGrams = 0
  const byModel: Array<{ model: string, carbonKg: number, percentage: number }> = []

  for (const usage of usageData) {
    const modelData = findBestEnergyProfileMatch(usage.model, usage.provider, energyRecords)

    if (!modelData) continue

    const regionData =
      regionRecords.find((region) =>
        region.provider === usage.provider &&
        Boolean(usage.region?.includes(region.region_identifier))
      ) ||
      regionRecords.find((region) => region.provider === usage.provider) ||
      regionRecords.find((region) => region.region_identifier === 'default') ||
      { carbon_intensity_gco2_per_kwh: 300, water_usage_effectiveness: 1.9, water_stress_multiplier: 1.2 }

    const energyWh =
      (usage.totalInputTokens / 1000) * modelData.energy_wh_per_1k_input_tokens +
      (usage.totalOutputTokens / 1000) * modelData.energy_wh_per_1k_output_tokens

    const PUE = 1.1
    const carbonGrams = (energyWh / 1000) * regionData.carbon_intensity_gco2_per_kwh * PUE
    totalCarbonGrams += carbonGrams

    const efficientAlternative =
      energyRecords.find((record) => record.model_class === 'small' && record.provider === usage.provider) ||
      energyRecords.find((record) => record.model_class === 'small')

    if (efficientAlternative) {
      const altEnergyWh =
        (usage.totalInputTokens / 1000) * efficientAlternative.energy_wh_per_1k_input_tokens +
        (usage.totalOutputTokens / 1000) * efficientAlternative.energy_wh_per_1k_output_tokens
      alternativeCarbonGrams += (altEnergyWh / 1000) * regionData.carbon_intensity_gco2_per_kwh * PUE
    }

    byModel.push({ model: usage.model, carbonKg: carbonGrams / 1000, percentage: 0 })
  }

  const totalCarbonKg = totalCarbonGrams / 1000
  byModel.forEach(m => {
    m.percentage = totalCarbonKg > 0 ? Math.round((m.carbonKg / totalCarbonKg) * 100) : 0
  })

  const totalTokens = usageData.reduce((sum, u) => sum + u.totalInputTokens + u.totalOutputTokens, 0)
  const weightedEfficiency = usageData.reduce((sum, u) => {
    const modelData = findBestEnergyProfileMatch(u.model, u.provider, energyRecords)
    const score = modelData?.relative_efficiency_score || 20
    const weight = (u.totalInputTokens + u.totalOutputTokens) / Math.max(totalTokens, 1)
    return sum + (score * weight)
  }, 0)

  return {
    totalCarbonKg,
    byModel: byModel.sort((a, b) => b.carbonKg - a.carbonKg),
    alternativeCarbonKg: alternativeCarbonGrams / 1000,
    savingsKg: totalCarbonKg - (alternativeCarbonGrams / 1000),
    savingsPercentage: totalCarbonKg > 0
      ? Math.round(((totalCarbonKg - alternativeCarbonGrams / 1000) / totalCarbonKg) * 100) : 0,
    modelEfficiencyScore: totalTokens > 0
      ? Math.round(Math.min(100, Math.max(1, weightedEfficiency)))
      : null,
    methodology: `Carbon = (tokens x energy_per_token x PUE) x regional_grid_intensity. ` +
      `PUE=1.1 (hyperscale average). Energy intensity from ArXiv 2505.09598. ` +
      `Grid intensity from EPA eGRID 2024 / IEA 2024.`
  }
}
