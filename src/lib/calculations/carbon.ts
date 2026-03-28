import { createClient } from '@/lib/supabase/server'

interface UsageRecord {
  model: string
  provider: string
  totalInputTokens: number
  totalOutputTokens: number
  region?: string
}

export async function calculateCarbon(usageData: UsageRecord[]) {
  const supabase = await createClient()
  const { data: energyLibrary } = await supabase.from('model_energy_library').select('*')
  const { data: regionalData } = await supabase.from('regional_carbon_intensity').select('*')

  let totalCarbonGrams = 0
  let alternativeCarbonGrams = 0
  const byModel: Array<{ model: string, carbonKg: number, percentage: number }> = []

  for (const usage of usageData) {
    const modelData =
      energyLibrary?.find(m => m.model_identifier === usage.model) ||
      energyLibrary?.find(m => usage.model.includes(m.model_identifier)) ||
      energyLibrary?.find(m => m.model_class === 'frontier' && m.provider === usage.provider) ||
      energyLibrary?.find(m => m.model_class === 'frontier')

    if (!modelData) continue

    const regionData =
      regionalData?.find(r => r.provider === usage.provider && usage.region?.includes(r.region_identifier)) ||
      regionalData?.find(r => r.provider === usage.provider) ||
      regionalData?.find(r => r.region_identifier === 'default') ||
      { carbon_intensity_gco2_per_kwh: 300, water_usage_effectiveness: 1.9, water_stress_multiplier: 1.2 }

    const energyWh =
      (usage.totalInputTokens / 1000) * modelData.energy_wh_per_1k_input_tokens +
      (usage.totalOutputTokens / 1000) * modelData.energy_wh_per_1k_output_tokens

    const PUE = 1.1
    const carbonGrams = (energyWh / 1000) * regionData.carbon_intensity_gco2_per_kwh * PUE
    totalCarbonGrams += carbonGrams

    const efficientAlternative =
      energyLibrary?.find(m => m.model_class === 'small' && m.provider === usage.provider) ||
      energyLibrary?.find(m => m.model_class === 'small')

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
    const modelData = energyLibrary?.find(m => m.model_identifier === u.model)
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
    modelEfficiencyScore: Math.round(Math.min(100, Math.max(1, weightedEfficiency))),
    methodology: `Carbon = (tokens x energy_per_token x PUE) x regional_grid_intensity. ` +
      `PUE=1.1 (hyperscale average). Energy intensity from ArXiv 2505.09598. ` +
      `Grid intensity from EPA eGRID 2024 / IEA 2024.`
  }
}
