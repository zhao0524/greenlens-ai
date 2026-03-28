import { backboard } from '@/lib/backboard/client'
import { createAdminClient } from '@/lib/supabase/admin'

export async function runStrategicTranslator(
  threadId: string,
  usageResult: any,
  carbonWaterResult: any,
  licenseResult: any,
  statResult: any,
  company: any
) {
  const supabase = createAdminClient()

  // Load relevant incentives for this company's regions and industry.
  // Build an OR filter: region matches one of the company's offices, OR region is 'Global'.
  const offices: string[] = company?.international_offices ?? []
  const regionFilter = offices.length > 0
    ? `region.in.(${offices.map((r: string) => r).join(',')}),region.eq.Global`
    : `region.eq.Global`
  const { data: incentives } = await supabase
    .from('incentives_library')
    .select('*')
    .or(regionFilter)

  const prompt = `
You are writing the executive intelligence section of an AI governance and sustainability report.
Your audience is a CTO, CFO, or Chief Sustainability Officer at a large enterprise.
Plain English only. No technical jargon.

PIPELINE FINDINGS:

Usage: ${usageResult.totalRequests?.toLocaleString()} total requests, ${usageResult.modelCount} models,
${usageResult.frontierModelPercentage}% using high-capability models.

Environmental: ${carbonWaterResult.totalCarbonKg?.toFixed(1)} kg CO2e/month,
${carbonWaterResult.totalWaterLiters?.toLocaleString()} liters water/month
(${carbonWaterResult.totalWaterBottles?.toLocaleString()} bottles).
Model efficiency score: ${carbonWaterResult.modelEfficiencyScore}/100.
Mismatch rate: ${carbonWaterResult.modelTaskMismatchRate}% of calls use high-capability models
for tasks that do not require them.
Optimal model scenario saves ${carbonWaterResult.carbonSavingsKg?.toFixed(1)} kg CO2 and
${carbonWaterResult.waterSavingsLiters?.toLocaleString()} liters per month.

License: ${licenseResult.totalLicensedSeats} licensed seats, ${licenseResult.totalActiveSeats} active,
${licenseResult.totalDormantSeats} dormant. Utilization: ${licenseResult.overallUtilizationRate}%.
Annual license cost: $${licenseResult.estimatedAnnualLicenseCost?.toLocaleString()}.
Potential renewal savings: $${licenseResult.potentialAnnualSavings?.toLocaleString()}.
Renewal alerts: ${JSON.stringify(licenseResult.renewalAlerts)}.

Statistical analysis:
- Anomaly detected: ${statResult?.anomaly_detection?.anomaly_detected}
  ${statResult?.anomaly_detection?.anomaly_detected ? `(${statResult.anomaly_detection.max_z_score} std deviations above baseline)` : ''}
- Trend: ${statResult?.usage_trend?.trend_direction} (p=${statResult?.usage_trend?.p_value})
- Carbon percentile vs ${company?.industry || 'industry'} peers: ${statResult?.carbon_percentile?.percentile}th
  (${statResult?.carbon_percentile?.relative_position})
- Projected 30-day requests: ${statResult?.usage_trend?.projected_30d_requests?.toLocaleString()}

Available incentives and compliance obligations for this company:
${JSON.stringify(incentives?.slice(0, 5))}

Return ONLY valid JSON. No markdown. No explanation.

{
  "decisions": [
    {
      "title": "8 words max",
      "situation": "2-3 sentences plain English, no jargon",
      "carbonSavedKg": number,
      "waterSavedLiters": number,
      "financialImpact": "dollar figure as string",
      "theDecision": "one sentence, what the exec decides",
      "teamEffort": "effort estimate only, no instructions",
      "riskOfInaction": "1-2 sentences",
      "urgency": "Act Now" | "Act This Quarter" | "Act Before Renewal" | "Monitor",
      "impactScore": number 1-10
    }
  ],
  "incentivesAndBenefits": [
    {
      "title": "incentive name",
      "description": "plain english description of what this means for this company",
      "estimatedValue": "dollar or compliance value",
      "region": "where this applies",
      "actionRequired": "what the company needs to do to access this benefit"
    }
  ],
  "mitigationStrategies": [
    {
      "strategy": "name of strategy",
      "description": "what to do",
      "expectedScoreImprovement": "e.g. +20 points in 60 days",
      "effort": "Low / Medium / High",
      "timeframe": "e.g. 30 days / 1 quarter"
    }
  ],
  "hypeCycleContext": "2-3 sentences framing where AI sits in the Gartner Hype Cycle and why recording this data now positions the company advantageously when AI moves to the Slope of Enlightenment.",
  "executiveNarrative": "3-4 sentences for the report cover. Direct, factual.",
  "esgDisclosureText": "2-3 paragraphs for CSRD or GRI report. Professional tone. Cites methodology."
}

Produce 2-4 decisions. Sort by impactScore descending. Produce 2-3 incentives most relevant to this company.
Produce 3 mitigation strategies specifically for improving a score of ${carbonWaterResult.modelEfficiencyScore}/100.
`

  const response = await backboard.sendMessage(threadId, prompt)

  try {
    // Backboard may return content in response.content or response.message or response.text
    const rawText = response?.content ?? response?.message ?? response?.text ?? ''
    const cleaned = rawText.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    if (!cleaned) throw new Error('Empty response from Backboard')
    const parsed = JSON.parse(cleaned)
    // Validate that required fields are present
    if (!parsed.decisions || !Array.isArray(parsed.decisions)) {
      throw new Error('Invalid response shape from Backboard')
    }
    return parsed
  } catch (err: any) {
    console.warn('Strategic translator parse error:', err.message, 'Raw response:', JSON.stringify(response)?.slice(0, 200))
    return {
      decisions: [], incentivesAndBenefits: [], mitigationStrategies: [],
      hypeCycleContext: '', executiveNarrative: 'Analysis complete.',
      esgDisclosureText: 'AI environmental data available in detailed report sections.'
    }
  }
}
