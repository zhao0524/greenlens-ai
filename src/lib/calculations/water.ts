const AVERAGE_WUE = 1.9

const REGIONAL_STRESS: Record<string, number> = {
  'us-east': 1.2, 'us-west': 1.8, 'us-central': 1.3,
  'europe': 0.85, 'canada': 0.7, 'asia-pacific': 1.4, 'default': 1.2
}

export function calculateWater(carbonResult: { totalCarbonKg: number }, region = 'default') {
  const stressMultiplier = REGIONAL_STRESS[region] || REGIONAL_STRESS['default']
  const estimatedEnergyKwh = (carbonResult.totalCarbonKg * 1000) / (300 * 1.1)
  const totalWaterLiters = estimatedEnergyKwh * AVERAGE_WUE * stressMultiplier
  const alternativeWaterLiters = totalWaterLiters * 0.35

  return {
    totalWaterLiters: Math.round(totalWaterLiters),
    totalWaterBottles: Math.round(totalWaterLiters / 0.519),
    alternativeWaterLiters: Math.round(alternativeWaterLiters),
    savingsLiters: Math.round(totalWaterLiters - alternativeWaterLiters),
    wueUsed: AVERAGE_WUE,
    stressMultiplier,
    methodology: `Water = estimated_energy_kWh x WUE (${AVERAGE_WUE} L/kWh) x ` +
      `regional_stress_multiplier (${stressMultiplier}). ` +
      `WUE: The Green Grid benchmark. Water stress: WRI Aqueduct database.`
  }
}
