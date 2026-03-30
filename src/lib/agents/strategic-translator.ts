import { backboard } from '@/lib/backboard/client'
import { generateWithGemini } from '@/lib/gemini/client'
import { createAdminClient } from '@/lib/supabase/admin'

interface CompanyProfile {
  name?: string | null
  industry?: string | null
  international_offices?: string[] | null
}

interface UsageSummary {
  totalRequests?: number
  modelCount?: number
  frontierModelPercentage?: number
}

interface CarbonWaterSummary {
  totalCarbonKg?: number | null
  totalWaterLiters?: number | null
  totalWaterBottles?: number | null
  modelEfficiencyScore?: number | null
  modelTaskMismatchRate?: number | null
  carbonSavingsKg?: number | null
  waterSavingsLiters?: number | null
}

interface LicenseSummary {
  totalLicensedSeats?: number
  totalActiveSeats?: number
  totalDormantSeats?: number
  overallUtilizationRate?: number | null
  estimatedAnnualLicenseCost?: number | null
  potentialAnnualSavings?: number | null
  renewalAlerts?: unknown[]
}

interface StatSummary {
  error?: string
  unavailable?: true
  message?: string
  anomaly_detection?: {
    anomaly_detected?: boolean
    max_z_score?: number
  }
  usage_trend?: {
    trend_direction?: string
    p_value?: number
    projected_30d_requests?: number
  }
  carbon_percentile?: {
    percentile?: number
    relative_position?: string
  }
}

interface TranslatorResponse {
  decisions: unknown[]
  incentivesAndBenefits: unknown[]
  mitigationStrategies: unknown[]
  hypeCycleContext: string
  executiveNarrative: string
  esgDisclosureText: string
}

function buildFallbackTranslatorResponse(): TranslatorResponse {
  return {
    decisions: [],
    incentivesAndBenefits: [],
    mitigationStrategies: [],
    hypeCycleContext: '',
    executiveNarrative: 'Analysis complete.',
    esgDisclosureText: 'AI environmental data available in detailed report sections.',
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

async function loadIncentives(company: CompanyProfile) {
  const supabase = createAdminClient()
  const offices: string[] = company?.international_offices ?? []
  const regionFilter = offices.length > 0
    ? `region.in.(${offices.map((r: string) => r).join(',')}),region.eq.Global`
    : `region.eq.Global`
  const { data: incentives } = await supabase
    .from('incentives_library')
    .select('*')
    .or(regionFilter)
  return incentives
}

function buildPrompt(
  usageResult: UsageSummary,
  carbonWaterResult: CarbonWaterSummary,
  licenseResult: LicenseSummary,
  statResult: StatSummary,
  company: CompanyProfile,
  incentives: Array<Record<string, unknown>>
) {
  const annualLicenseCost = licenseResult.estimatedAnnualLicenseCost != null
    ? `$${licenseResult.estimatedAnnualLicenseCost.toLocaleString()}`
    : 'Not modeled for all connected license providers.'
  const potentialRenewalSavings = licenseResult.potentialAnnualSavings != null
    ? `$${licenseResult.potentialAnnualSavings.toLocaleString()}`
    : 'Not modeled for all connected license providers.'

  const officeList = company?.international_offices?.length
    ? company.international_offices.join(', ')
    : 'Global'

  return `
You are writing the executive intelligence section of an AI governance and sustainability report.
Your audience is a CTO, CFO, or Chief Sustainability Officer at a large enterprise.
Plain English only. No technical jargon. Frame everything in terms of financial impact, regulatory risk, and competitive positioning — not environmental idealism.

IMPORTANT CONTEXT:
- This report covers the ORGANISATION's AI footprint in aggregate. It does NOT track individual employees, their prompts, or their personal usage. Make this clear when relevant.
- International offices: ${officeList}. Where applicable, tailor incentives and obligations to those jurisdictions.

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
Annual license cost: ${annualLicenseCost}.
Potential renewal savings: ${potentialRenewalSavings}.
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

REQUIREMENTS FOR INCENTIVES AND BENEFITS:
- Cover ALL relevant categories: tax credits, grants, ESG compliance obligations (and penalties for non-compliance), reduced infrastructure costs (data centre cooling, water bills), awards and industry recognition programs, and publicity/reputational benefits.
- For companies with European offices: include CSRD mandatory disclosure obligations and penalties for non-compliance, EU Green Deal-aligned grants, and relevant EU taxonomy benefits.
- For companies with Asia-Pacific offices: include relevant regional green tech incentives, sustainability certifications, and government-backed grants.
- Include at least one entry about industry awards or third-party certification programs (e.g. CDP A-List, Science Based Targets, sustainability indices) that this company could qualify for.
- Include at least one entry about the financial benefit of reduced data centre cooling and water consumption costs from more efficient AI usage.
- Where there are regulatory penalties for non-disclosure or non-compliance with ESG frameworks in this company's jurisdictions, explicitly quantify or describe the penalty risk.

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
      "riskOfInaction": "1-2 sentences covering financial, regulatory, or reputational downside",
      "urgency": "Act Now" | "Act This Quarter" | "Act Before Renewal" | "Monitor",
      "impactScore": number 1-10
    }
  ],
  "incentivesAndBenefits": [
    {
      "title": "incentive or obligation name",
      "description": "plain english description of what this means for this company — frame financial, regulatory, and reputational value in leadership terms",
      "estimatedValue": "dollar amount, penalty amount, or qualitative value",
      "region": "jurisdiction where this applies (e.g. EU, United States, Singapore, Global)",
      "actionRequired": "what the company needs to do to access the benefit or avoid the penalty",
      "category": "Financial" | "Regulatory" | "Reputational" | "Operational"
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
  "executiveNarrative": "3-4 sentences for the report cover. Direct, factual. Lead with financial and regulatory implications.",
  "esgDisclosureText": "2-3 paragraphs for CSRD or GRI report. Professional tone. Cites methodology. Clarify that data covers organisational AI usage in aggregate and does not capture individual employee activity."
}

Produce 2-4 decisions. Sort by impactScore descending.
Produce 4-6 incentives covering financial, regulatory (including penalty exposure), reputational, and operational categories — with geographic spread across the company's office regions.
Produce 3 mitigation strategies specifically for improving a score of ${carbonWaterResult.modelEfficiencyScore}/100.
`
}

function parseTranslatorResponse(rawText: string, source: string) {
  const cleaned = rawText.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  if (!cleaned) throw new Error(`Empty response from ${source}`)
  const parsed = JSON.parse(cleaned) as Partial<TranslatorResponse>
  if (!parsed.decisions || !Array.isArray(parsed.decisions)) {
    throw new Error(`Invalid response shape from ${source}`)
  }
  return {
    decisions: parsed.decisions,
    incentivesAndBenefits: parsed.incentivesAndBenefits ?? [],
    mitigationStrategies: parsed.mitigationStrategies ?? [],
    hypeCycleContext: parsed.hypeCycleContext ?? '',
    executiveNarrative: parsed.executiveNarrative ?? 'Analysis complete.',
    esgDisclosureText: parsed.esgDisclosureText ?? 'AI environmental data available in detailed report sections.',
  } satisfies TranslatorResponse
}

// Backboard path — uses persistent thread with accumulated agent context
export async function runStrategicTranslator(
  threadId: string,
  usageResult: UsageSummary,
  carbonWaterResult: CarbonWaterSummary,
  licenseResult: LicenseSummary,
  statResult: StatSummary,
  company: CompanyProfile
) {
  const incentives = await loadIncentives(company)
  const prompt = buildPrompt(usageResult, carbonWaterResult, licenseResult, statResult, company, incentives ?? [])

  const response = await backboard.sendMessage(threadId, prompt)

  try {
    const payload = response as {
      content?: string
      message?: string
      text?: string
    } | null
    const rawText = payload?.content ?? payload?.message ?? payload?.text ?? ''
    return parseTranslatorResponse(rawText, 'Backboard')
  } catch (err: unknown) {
    console.warn(
      'Strategic translator parse error:',
      getErrorMessage(err),
      'Raw response:',
      JSON.stringify(response)?.slice(0, 200)
    )
    return buildFallbackTranslatorResponse()
  }
}

// Gemini path — stateless, all data passed in a single prompt
export async function runStrategicTranslatorGemini(
  usageResult: UsageSummary,
  carbonWaterResult: CarbonWaterSummary,
  licenseResult: LicenseSummary,
  statResult: StatSummary,
  company: CompanyProfile
) {
  const incentives = await loadIncentives(company)
  const prompt = buildPrompt(usageResult, carbonWaterResult, licenseResult, statResult, company, incentives ?? [])

  const rawText = await generateWithGemini(prompt)

  try {
    return parseTranslatorResponse(rawText, 'Gemini')
  } catch (err: unknown) {
    console.warn(
      'Gemini strategic translator parse error:',
      getErrorMessage(err),
      'Raw response:',
      rawText?.slice(0, 200)
    )
    return buildFallbackTranslatorResponse()
  }
}
