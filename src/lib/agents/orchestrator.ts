import { createClient } from '@/lib/supabase/server'
import { backboard } from '@/lib/backboard/client'
import { runUsageAnalyst } from './usage-analyst'
import { runCarbonWaterAccountant } from './carbon-water-accountant'
import { runLicenseIntelligence } from './license-intelligence'
import { runStrategicTranslator } from './strategic-translator'
import { runSynthesis } from './synthesis'
import { runStatAnalysis } from '@/lib/analysis/run-stat-analysis'

export async function runPipeline(jobId: string, companyId: string) {
  const supabase = await createClient()

  const setStatus = async (status: string, agent?: string) =>
    supabase.from('analysis_jobs').update({
      status, current_agent: agent || null,
      ...(status === 'running' && !agent ? { started_at: new Date().toISOString() } : {}),
      ...(['complete', 'failed'].includes(status) ? { completed_at: new Date().toISOString() } : {})
    }).eq('id', jobId)

  const saveOutput = async (agentName: string, output: any) =>
    supabase.from('agent_outputs').insert({ job_id: jobId, agent_name: agentName, output })

  try {
    await setStatus('running')

    const assistant = await backboard.createAssistant(
      `GreenLens-${companyId}-${jobId}`,
      `You are the GreenLens analysis pipeline coordinator.
       You receive structured JSON findings from specialist agents and stat analysis.
       Store all findings in memory and make them available to subsequent agents.
       Always respond in valid JSON only. No markdown.`
    )
    const thread = await backboard.createThread(assistant.assistant_id)
    const threadId = thread.thread_id

    const { data: integrations } = await supabase.from('integrations').select('*')
      .eq('company_id', companyId).eq('is_active', true)

    const { data: company } = await supabase.from('companies').select('*')
      .eq('id', companyId).single()

    // ── AGENT 1: Usage Analyst ────────────────────────────────────────
    await setStatus('running', 'usage_analyst')
    const usageResult = await runUsageAnalyst(integrations || [])
    await saveOutput('usage_analyst', usageResult)
    await backboard.sendMessage(threadId, JSON.stringify({
      event: 'agent_complete', agent: 'usage_analyst', findings: usageResult
    }))

    // ── STAT ANALYSIS + NLP ───────────────────────────────────────────
    await setStatus('running', 'stat_analysis')
    const statResult = await runStatAnalysis({
      normalizedUsage: usageResult.normalizedUsage,
      dailyRequestCounts: usageResult.dailyRequestCounts || [],
      totalCarbonKg: 0, // will be updated after carbon agent
      industry: company?.industry || 'default'
    })
    await saveOutput('stat_analysis', statResult)
    await backboard.sendMessage(threadId, JSON.stringify({
      event: 'stat_analysis_complete', findings: statResult
    }))

    // ── AGENT 2: Carbon & Water Accountant ────────────────────────────
    await setStatus('running', 'carbon_water_accountant')
    const carbonWaterResult = await runCarbonWaterAccountant(usageResult, statResult)
    await saveOutput('carbon_water_accountant', carbonWaterResult)
    await backboard.sendMessage(threadId, JSON.stringify({
      event: 'agent_complete', agent: 'carbon_water_accountant', findings: carbonWaterResult
    }))

    // ── AGENT 3: License Intelligence ─────────────────────────────────
    await setStatus('running', 'license_intelligence')
    const licenseResult = await runLicenseIntelligence(integrations || [])
    await saveOutput('license_intelligence', licenseResult)
    await backboard.sendMessage(threadId, JSON.stringify({
      event: 'agent_complete', agent: 'license_intelligence', findings: licenseResult
    }))

    // ── AGENT 4: Strategic Translator ─────────────────────────────────
    await setStatus('running', 'strategic_translator')
    const translatorResult = await runStrategicTranslator(
      threadId, usageResult, carbonWaterResult, licenseResult, statResult, company
    )
    await saveOutput('strategic_translator', translatorResult)

    // ── SYNTHESIS ─────────────────────────────────────────────────────
    await setStatus('running', 'synthesis')
    const reportId = await runSynthesis(jobId, companyId, {
      usage: usageResult, carbonWater: carbonWaterResult,
      license: licenseResult, translator: translatorResult,
      statAnalysis: statResult
    })

    await setStatus('complete')
    return reportId

  } catch (error: any) {
    await supabase.from('analysis_jobs').update({
      status: 'failed', error_message: error.message,
      completed_at: new Date().toISOString()
    }).eq('id', jobId)
    throw error
  }
}
