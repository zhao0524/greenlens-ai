import { calculateCarbon } from '@/lib/calculations/carbon'
import { calculateWater } from '@/lib/calculations/water'
import type { NormalizedUsage } from './usage-analyst'

export async function runCarbonWaterAccountant(
  usageResult: { normalizedUsage: NormalizedUsage[], frontierModelPercentage: number },
  statResult: any
) {
  const carbon = await calculateCarbon(usageResult.normalizedUsage)
  const primaryRegion = usageResult.normalizedUsage[0]?.region?.includes('eu')
    ? 'europe' : usageResult.normalizedUsage[0]?.region?.includes('west') ? 'us-west' : 'us-east'
  const water = calculateWater(carbon, primaryRegion)

  // Use NLP task clustering from stat analysis to identify mismatches
  // more accurately than threshold rules alone
  const taskClusters = statResult?.task_clustering?.clusters || []
  const mismatchedClusters = taskClusters.filter((c: any) =>
    c.task_category === 'classification_routing' &&
    ['gpt-4', 'claude-3-opus'].some((m: string) => c.model?.includes(m))
  )

  const mismatchedRequests = usageResult.normalizedUsage
    .filter(u => mismatchedClusters.some((c: any) => c.model === u.model))
    .reduce((s, u) => s + u.totalRequests, 0)
  const totalRequests = usageResult.normalizedUsage.reduce((s, u) => s + u.totalRequests, 0)

  return {
    totalCarbonKg: carbon.totalCarbonKg,
    carbonByModel: carbon.byModel,
    alternativeCarbonKg: carbon.alternativeCarbonKg,
    carbonSavingsKg: carbon.savingsKg,
    carbonSavingsPercentage: carbon.savingsPercentage,
    carbonMethodology: carbon.methodology,
    totalWaterLiters: water.totalWaterLiters,
    totalWaterBottles: water.totalWaterBottles,
    alternativeWaterLiters: water.alternativeWaterLiters,
    waterSavingsLiters: water.savingsLiters,
    waterMethodology: water.methodology,
    modelEfficiencyScore: carbon.modelEfficiencyScore,
    modelTaskMismatchRate: totalRequests > 0
      ? Math.round((mismatchedRequests / totalRequests) * 100) : 0,
    mismatchedModelClusters: mismatchedClusters.map((c: any) => ({
      model: c.model,
      taskCategory: c.task_category,
      suggestedAlternative: c.model?.includes('gpt-4') ? 'gpt-4o-mini'
        : c.model?.includes('claude-3-opus') ? 'claude-3-haiku' : 'a smaller model'
    }))
  }
}
