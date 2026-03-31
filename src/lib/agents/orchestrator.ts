/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/admin'
import type { PostgrestError } from '@supabase/supabase-js'
import { backboard, FALLBACK_TRANSLATOR_OUTPUT } from '@/lib/backboard/client'
import {
  buildReportAvailability,
  deriveDataFreshness,
  type ReportAvailability,
} from '@/lib/analysis/provider-status'
import {
  getNextPipelineStep,
  isPipelineStep,
  resolveNextPipelineStep,
  type PipelineStep,
} from '@/lib/analysis/pipeline-steps'
import {
  ANALYSIS_LEASE_TTL_MS,
  ANALYSIS_MAX_AGE_TIMEOUT_MESSAGE,
  hasAnalysisJobExceededMaxAge,
  isClaimableActiveAnalysisJob,
  type PersistedAnalysisJob,
} from '@/lib/analysis/state'
import { calculateCarbon } from '@/lib/calculations/carbon'
import type { IntegrationRecord } from '@/lib/integrations/types'
import { runUsageAnalyst, type UsageAnalysisResult } from './usage-analyst'
import {
  runCarbonWaterAccountant,
  type CarbonWaterAccountantResult,
} from './carbon-water-accountant'
import {
  runLicenseIntelligence,
  type LicenseIntelligenceResult,
} from './license-intelligence'
import { runStrategicTranslator, runStrategicTranslatorGemini } from './strategic-translator'
import { runSynthesis } from './synthesis'
import {
  buildUnavailableStatAnalysis,
  runStatAnalysis,
  type StatAnalysisRunResult,
} from '@/lib/analysis/run-stat-analysis'

type StatAnalysisOutput = StatAnalysisRunResult
type CarbonWaterResult = CarbonWaterAccountantResult
type SavedOutputStep = Exclude<PipelineStep, 'synthesis'>
type SavedPipelineOutputs = Partial<Record<SavedOutputStep, unknown>>

interface PersistedAnalysisJobRow extends PersistedAnalysisJob {
  company_id: string | null
  backboard_thread_id: string | null
}

interface AgentOutputRow {
  agent_name: string
  output: unknown
}

interface LoadedJobArtifacts {
  completedAgents: string[]
  outputRows: AgentOutputRow[]
  outputs: SavedPipelineOutputs
  reportId: string | null
}

interface ClaimedJobLease {
  job: PersistedAnalysisJobRow
  leaseExpiresAt: string
  step: PipelineStep
}

interface StepExecutionResult {
  output?: unknown
  reportId?: string | null
}

function throwIfSupabaseError(error: PostgrestError | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`)
  }
}

function mapSavedOutputs(rows: AgentOutputRow[]): SavedPipelineOutputs {
  const outputs: SavedPipelineOutputs = {}

  for (const row of rows) {
    if (!isPipelineStep(row.agent_name) || row.agent_name === 'synthesis') {
      continue
    }

    outputs[row.agent_name] = row.output
  }

  return outputs
}

function collectCompletedAgents(rows: AgentOutputRow[]) {
  return rows
    .map((row) => row.agent_name)
    .filter((agentName): agentName is SavedOutputStep =>
      isPipelineStep(agentName) && agentName !== 'synthesis'
    )
}

function requireOutput<T>(outputs: SavedPipelineOutputs, step: SavedOutputStep): T {
  const output = outputs[step]
  if (!output) {
    throw new Error(`Missing ${step} output while resuming the analysis pipeline.`)
  }

  return output as T
}

export async function upsertAgentOutput(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
  agentName: SavedOutputStep,
  output: unknown
) {
  const { error } = await supabase
    .from('agent_outputs')
    .upsert(
      { job_id: jobId, agent_name: agentName, output },
      { onConflict: 'job_id,agent_name' }
    )

  throwIfSupabaseError(error, `Failed to persist ${agentName} output for job ${jobId}`)
}

async function loadJobAndArtifacts(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string
) {
  const [{ data: job, error: jobError }, { data: outputRows, error: outputsError }, { data: report, error: reportError }] = await Promise.all([
    supabase
      .from('analysis_jobs')
      .select('id, company_id, status, current_agent, error_message, created_at, started_at, completed_at, backboard_thread_id, lease_expires_at, last_progress_at')
      .eq('id', jobId)
      .maybeSingle(),
    supabase
      .from('agent_outputs')
      .select('agent_name, output')
      .eq('job_id', jobId),
    supabase
      .from('reports')
      .select('id')
      .eq('job_id', jobId)
      .maybeSingle(),
  ])

  throwIfSupabaseError(jobError, `Failed to load analysis job ${jobId}`)
  throwIfSupabaseError(outputsError, `Failed to load agent outputs for job ${jobId}`)
  throwIfSupabaseError(reportError, `Failed to load report for job ${jobId}`)

  return {
    job: (job ?? null) as PersistedAnalysisJobRow | null,
    artifacts: {
      completedAgents: collectCompletedAgents((outputRows ?? []) as AgentOutputRow[]),
      outputRows: (outputRows ?? []) as AgentOutputRow[],
      outputs: mapSavedOutputs((outputRows ?? []) as AgentOutputRow[]),
      reportId: report?.id ?? null,
    } satisfies LoadedJobArtifacts,
  }
}

async function claimJobLease(
  supabase: ReturnType<typeof createAdminClient>,
  job: PersistedAnalysisJobRow,
  step: PipelineStep
) {
  const nowIso = new Date().toISOString()
  const leaseExpiresAt = new Date(Date.now() + ANALYSIS_LEASE_TTL_MS).toISOString()

  let query = supabase
    .from('analysis_jobs')
    .update({
      status: 'running',
      current_agent: step,
      started_at: job.started_at ?? nowIso,
      lease_expires_at: leaseExpiresAt,
      last_progress_at: nowIso,
      error_message: null,
    })
    .eq('id', job.id)
    .eq('status', job.status)

  query = job.current_agent == null
    ? query.is('current_agent', null)
    : query.eq('current_agent', job.current_agent)

  query = job.lease_expires_at == null
    ? query.is('lease_expires_at', null)
    : query.eq('lease_expires_at', job.lease_expires_at)

  const { data, error } = await query
    .select('id, company_id, status, current_agent, error_message, created_at, started_at, completed_at, backboard_thread_id, lease_expires_at, last_progress_at')
    .maybeSingle()

  throwIfSupabaseError(error, `Failed to claim analysis job ${job.id}`)

  if (!data) {
    return null
  }

  return {
    job: data as PersistedAnalysisJobRow,
    leaseExpiresAt,
    step,
  } satisfies ClaimedJobLease
}

async function advanceJobAfterStep(
  supabase: ReturnType<typeof createAdminClient>,
  claim: ClaimedJobLease,
  nextStep: PipelineStep | null
) {
  const updatePayload = nextStep
    ? {
        status: 'pending',
        current_agent: nextStep,
        lease_expires_at: null,
        last_progress_at: new Date().toISOString(),
        error_message: null,
      }
    : {
        status: 'complete',
        current_agent: null,
        lease_expires_at: null,
        completed_at: new Date().toISOString(),
        last_progress_at: new Date().toISOString(),
        error_message: null,
      }

  const { data, error } = await supabase
    .from('analysis_jobs')
    .update(updatePayload)
    .eq('id', claim.job.id)
    .eq('status', 'running')
    .eq('current_agent', claim.step)
    .eq('lease_expires_at', claim.leaseExpiresAt)
    .select('id')
    .maybeSingle()

  throwIfSupabaseError(error, `Failed to advance analysis job ${claim.job.id}`)
  return Boolean(data?.id)
}

async function markJobFailed(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
  errorMessage: string,
  claim?: ClaimedJobLease | null
) {
  let query = supabase
    .from('analysis_jobs')
    .update({
      status: 'failed',
      current_agent: null,
      lease_expires_at: null,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
      last_progress_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (claim) {
    query = query
      .eq('status', 'running')
      .eq('current_agent', claim.step)
      .eq('lease_expires_at', claim.leaseExpiresAt)
  } else {
    query = query.in('status', ['pending', 'running', 'complete'])
  }

  const { error } = await query
  throwIfSupabaseError(error, `Failed to mark analysis job ${jobId} as failed`)
}

async function getActiveIntegrations(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string
) {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)

  throwIfSupabaseError(error, `Failed to load integrations for company ${companyId}`)
  return (data ?? []) as IntegrationRecord[]
}

async function getCompany(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string
) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  throwIfSupabaseError(error, `Failed to load company ${companyId}`)
  return data
}

async function getCompanyAnalysisRunCount(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string
) {
  const { count, error } = await supabase
    .from('analysis_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)

  throwIfSupabaseError(error, `Failed to count analysis runs for company ${companyId}`)
  return count ?? 1
}

async function seedBackboardThread(
  threadId: string,
  outputs: SavedPipelineOutputs
) {
  const orderedSeedSteps: SavedOutputStep[] = [
    'usage_analyst',
    'stat_analysis',
    'carbon_water_accountant',
    'license_intelligence',
  ]

  for (const step of orderedSeedSteps) {
    const output = outputs[step]
    if (!output) continue

    if (step === 'stat_analysis') {
      await backboard.sendMessage(threadId, JSON.stringify({
        event: 'stat_analysis_complete',
        findings: output,
      }))
      continue
    }

    await backboard.sendMessage(threadId, JSON.stringify({
      event: 'agent_complete',
      agent: step,
      findings: output,
    }))
  }
}

async function prepareStrategicTranslatorThread(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
  companyId: string,
  existingThreadId: string | null,
  outputs: SavedPipelineOutputs,
  withTimeout: <T>(label: string, promise: Promise<T>, timeoutMs: number) => Promise<T>
) {
  if (existingThreadId) {
    return existingThreadId
  }

  try {
    const assistant = await withTimeout(
      'Backboard setup',
      backboard.createAssistant(
        `GreenLens-${companyId}-${jobId}`,
        `You are the GreenLens analysis pipeline coordinator.
         You receive structured JSON findings from specialist agents and stat analysis.
         Store all findings in memory and make them available to subsequent agents.
         Always respond in valid JSON only. No markdown.`
      ),
      10000
    )

    const thread = await withTimeout(
      'Backboard thread',
      backboard.createThread(assistant.assistant_id ?? assistant.id),
      10000
    )

    const threadId = thread.thread_id ?? thread.id ?? null
    if (!threadId) return null

    await withTimeout(
      'Backboard thread seed',
      seedBackboardThread(threadId, outputs),
      10000
    )

    const { error } = await supabase
      .from('analysis_jobs')
      .update({ backboard_thread_id: threadId })
      .eq('id', jobId)

    throwIfSupabaseError(error, `Failed to persist Backboard thread for job ${jobId}`)
    return threadId
  } catch (backboardError: any) {
    console.warn('Backboard unavailable, running without LLM strategic analysis:', backboardError.message)
    return null
  }
}

async function executePipelineStep(
  supabase: ReturnType<typeof createAdminClient>,
  claim: ClaimedJobLease,
  artifacts: LoadedJobArtifacts,
  withTimeout: <T>(label: string, promise: Promise<T>, timeoutMs: number) => Promise<T>
): Promise<StepExecutionResult> {
  const companyId = claim.job.company_id
  if (!companyId) {
    throw new Error(`Analysis job ${claim.job.id} is missing a company_id.`)
  }

  switch (claim.step) {
    case 'usage_analyst': {
      const integrations = await getActiveIntegrations(supabase, companyId)
      const demoRunIndex = await getCompanyAnalysisRunCount(supabase, companyId)
      const usageResult = await withTimeout(
        'Usage analyst',
        runUsageAnalyst(integrations, { demoRunIndex }),
        20000
      )
      return { output: usageResult }
    }

    case 'stat_analysis': {
      const usageResult = requireOutput<UsageAnalysisResult>(artifacts.outputs, 'usage_analyst')
      if (usageResult.availability.status === 'unavailable') {
        return {
          output: buildUnavailableStatAnalysis(
            usageResult.availability.message ?? 'Usage data is unavailable.'
          ),
        }
      }

      const company = await getCompany(supabase, companyId)
      const precomputedCarbon = await withTimeout(
        'Carbon baseline',
        calculateCarbon(usageResult.normalizedUsage),
        10000
      )

      const statResult = await runStatAnalysis({
        normalizedUsage: usageResult.normalizedUsage,
        dailyRequestCounts: usageResult.dailyRequestCounts || [],
        totalCarbonKg: precomputedCarbon.totalCarbonKg,
        industry: company?.industry || 'default',
      })

      return { output: statResult }
    }

    case 'carbon_water_accountant': {
      const usageResult = requireOutput<UsageAnalysisResult>(artifacts.outputs, 'usage_analyst')
      const statResult = requireOutput<StatAnalysisOutput>(artifacts.outputs, 'stat_analysis')

       if (usageResult.availability.status === 'unavailable') {
        const carbonWaterResult = await withTimeout(
          'Carbon & water accountant',
          runCarbonWaterAccountant(usageResult, statResult),
          15000
        )

        return { output: carbonWaterResult }
      }

      const precomputedCarbon = await withTimeout(
        'Carbon baseline',
        calculateCarbon(usageResult.normalizedUsage),
        10000
      )

      const carbonWaterResult = await withTimeout(
        'Carbon & water accountant',
        runCarbonWaterAccountant(usageResult, statResult, precomputedCarbon),
        15000
      )

      return { output: carbonWaterResult }
    }

    case 'license_intelligence': {
      const integrations = await getActiveIntegrations(supabase, companyId)
      const usageResult = artifacts.outputs.usage_analyst as UsageAnalysisResult | undefined
      const licenseResult = await withTimeout(
        'License intelligence',
        runLicenseIntelligence(integrations, {
          usageRecords: usageResult?.normalizedUsage,
        }),
        20000
      )

      return { output: licenseResult }
    }

    case 'strategic_translator': {
      const usageResult = requireOutput<UsageAnalysisResult>(artifacts.outputs, 'usage_analyst')
      const carbonWaterResult = requireOutput<CarbonWaterResult>(artifacts.outputs, 'carbon_water_accountant')
      const licenseResult = requireOutput<LicenseIntelligenceResult>(artifacts.outputs, 'license_intelligence')
      const statResult = requireOutput<StatAnalysisOutput>(artifacts.outputs, 'stat_analysis')
      const company = await getCompany(supabase, companyId)
      const reportAvailability = buildReportAvailability({
        usage: usageResult.availability,
        license: licenseResult.availability,
      })

      if (
        usageResult.availability.status === 'unavailable' ||
        usageResult.totalRequests === 0 ||
        carbonWaterResult.modelEfficiencyScore == null
      ) {
        return {
          output: usageResult.availability.status === 'unavailable'
            ? buildPartialTranslation(usageResult, licenseResult, company, reportAvailability)
            : buildFallbackTranslation(
              usageResult,
              carbonWaterResult,
              licenseResult,
              statResult,
              company
            ),
        }
      }

      const threadId = await prepareStrategicTranslatorThread(
        supabase,
        claim.job.id,
        companyId,
        claim.job.backboard_thread_id,
        artifacts.outputs,
        withTimeout
      )

      let translatorResult: any = FALLBACK_TRANSLATOR_OUTPUT

      if (threadId) {
        try {
          translatorResult = await withTimeout(
            'Strategic translator',
            runStrategicTranslator(
              threadId,
              usageResult,
              carbonWaterResult,
              licenseResult,
              statResult,
              company
            ),
            25000
          )
        } catch (translatorError: any) {
          console.warn(
            'Backboard strategic translator failed, falling back to Gemini:',
            translatorError.message
          )
          try {
            translatorResult = await withTimeout(
              'Strategic translator (Gemini)',
              runStrategicTranslatorGemini(
                usageResult,
                carbonWaterResult,
                licenseResult,
                statResult,
                company
              ),
              35000
            )
          } catch (geminiError: any) {
            console.warn(
              'Gemini strategic translator unavailable, using deterministic fallback:',
              geminiError.message
            )
            translatorResult = buildFallbackTranslation(
              usageResult,
              carbonWaterResult,
              licenseResult,
              statResult,
              company
            )
          }
        }
      } else {
        try {
          translatorResult = await withTimeout(
            'Strategic translator (Gemini)',
            runStrategicTranslatorGemini(
              usageResult,
              carbonWaterResult,
              licenseResult,
              statResult,
              company
            ),
            35000
          )
        } catch (geminiError: any) {
          console.warn(
            'Gemini strategic translator unavailable, using deterministic fallback:',
            geminiError.message
          )
          translatorResult = buildFallbackTranslation(
            usageResult,
            carbonWaterResult,
            licenseResult,
            statResult,
            company
          )
        }
      }

      return { output: translatorResult }
    }

    case 'synthesis': {
      const usageResult = requireOutput<UsageAnalysisResult>(artifacts.outputs, 'usage_analyst')
      const carbonWaterResult = requireOutput<CarbonWaterResult>(artifacts.outputs, 'carbon_water_accountant')
      const licenseResult = requireOutput<LicenseIntelligenceResult>(artifacts.outputs, 'license_intelligence')
      const translatorResult = requireOutput<any>(artifacts.outputs, 'strategic_translator')
      const statResult = requireOutput<StatAnalysisOutput>(artifacts.outputs, 'stat_analysis')
      const providerStatuses = [
        ...(usageResult.providerStatus ?? []),
        ...(licenseResult.providerStatus ?? []),
      ]
      const reportAvailability = buildReportAvailability({
        usage: usageResult.availability,
        license: licenseResult.availability,
      })

      const reportId = await withTimeout(
        'Synthesis',
        runSynthesis(claim.job.id, companyId, {
          usage: usageResult,
          carbonWater: carbonWaterResult,
          license: licenseResult,
          translator: translatorResult,
          statAnalysis: statResult,
          meta: {
            reportMode: reportAvailability.reportMode,
            sectionAvailability: reportAvailability.sectionAvailability,
            dataFreshness: deriveDataFreshness(providerStatuses),
            providerStatuses,
          },
        }),
        30000
      )

      return { reportId }
    }
  }
}

export async function advanceAnalysisJob(jobId: string, companyId: string) {
  const supabase = createAdminClient()

  const withTimeout = async <T>(
    label: string,
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`))
          }, timeoutMs)
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  try {
    const { job, artifacts } = await loadJobAndArtifacts(supabase, jobId)
    if (!job || job.company_id !== companyId) {
      return null
    }

    if (hasAnalysisJobExceededMaxAge(job)) {
      await markJobFailed(supabase, jobId, ANALYSIS_MAX_AGE_TIMEOUT_MESSAGE)
      return null
    }

    const nextStep = resolveNextPipelineStep(
      artifacts.completedAgents,
      Boolean(artifacts.reportId)
    )

    if (!nextStep) {
      if (artifacts.reportId && job.status !== 'complete') {
        const { error } = await supabase
          .from('analysis_jobs')
          .update({
            status: 'complete',
            current_agent: null,
            lease_expires_at: null,
            completed_at: new Date().toISOString(),
            last_progress_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', jobId)

        throwIfSupabaseError(error, `Failed to complete analysis job ${jobId}`)
      }

      return artifacts.reportId
    }

    if (!isClaimableActiveAnalysisJob(job)) {
      return artifacts.reportId
    }

    const claim = await claimJobLease(supabase, job, nextStep)
    if (!claim) {
      return artifacts.reportId
    }

    try {
      const result = await executePipelineStep(supabase, claim, artifacts, withTimeout)

      if (claim.step !== 'synthesis') {
        await upsertAgentOutput(
          supabase,
          jobId,
          claim.step as SavedOutputStep,
          result.output
        )
      }

      const advanced = await advanceJobAfterStep(
        supabase,
        claim,
        getNextPipelineStep(claim.step)
      )

      if (!advanced) {
        return artifacts.reportId
      }

      return result.reportId ?? artifacts.reportId
    } catch (stepError: any) {
      const message = stepError instanceof Error ? stepError.message : 'Unknown pipeline step failure'
      await markJobFailed(supabase, jobId, message, claim)
      return null
    }
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Unknown pipeline failure'
    console.error(`[Pipeline ${jobId}] Step advance failed:`, message)
    await markJobFailed(supabase, jobId, message).catch((markFailedError) => {
      console.error(`[Pipeline ${jobId}] Failed to mark job as failed:`, markFailedError)
    })
    return null
  }
}

export async function runPipeline(jobId: string, companyId: string) {
  return advanceAnalysisJob(jobId, companyId)
}

function buildLicenseRightsizingDecision(license: LicenseIntelligenceResult) {
  const potentialAnnualSavings = license.potentialAnnualSavings ?? 0

  return {
    title: 'Right-size AI licenses at renewal',
    situation: `${license.totalDormantSeats} of ${license.totalLicensedSeats} licensed seats are inactive. Reducing seat count at renewal captures immediate savings.`,
    carbonSavedKg: 0,
    waterSavedLiters: 0,
    financialImpact: `$${potentialAnnualSavings.toLocaleString()}/year`,
    theDecision: 'Reduce licensed seat count to active users plus a 15% buffer.',
    teamEffort: 'Procurement action at renewal date',
    riskOfInaction: `$${potentialAnnualSavings.toLocaleString()} in wasted spend annually.`,
    urgency: 'Act Before Renewal',
    impactScore: 7,
  }
}

function buildPartialTranslation(
  usage: UsageAnalysisResult,
  license: LicenseIntelligenceResult,
  company: any,
  reportAvailability: ReportAvailability
) {
  const decisions: any[] = []

  if (license.availability.status === 'available' && (license.potentialAnnualSavings ?? 0) > 0) {
    decisions.push(buildLicenseRightsizingDecision(license))
  }

  const unavailableSections = Object.entries(reportAvailability.sectionAvailability)
    .filter(([, section]) => section.status === 'unavailable')
    .map(([sectionName]) => sectionName.replace(/_/g, ' '))

  const usageMessage = usage.availability.message
    ?? 'Supported usage data is unavailable in this build.'
  const availableLicenseProviders = license.providers.map((provider) => provider.provider).join(', ')
  const licenseMessage = license.availability.status === 'available'
    ? license.totalLicensedSeats > 0
      ? `Billing and license visibility is available${availableLicenseProviders ? ` for ${availableLicenseProviders}` : ''}: ${license.overallUtilizationRate}% across ${license.totalLicensedSeats} seats, with ${license.estimatedAnnualSpend != null ? `$${license.estimatedAnnualSpend.toLocaleString()}` : 'partial'} spend coverage.`
      : `Modeled AI billing is available${availableLicenseProviders ? ` for ${availableLicenseProviders}` : ''}${license.estimatedAnnualSpend != null ? `: $${license.estimatedAnnualSpend.toLocaleString()} annualized spend.` : '.'}`
    : license.availability.message ?? 'No supported license analysis is available.'

  return {
    decisions,
    incentivesAndBenefits: [],
    mitigationStrategies: [],
    hypeCycleContext: '',
    executiveNarrative: [
      `${company?.name ?? 'Your organisation'} has a partial GreenLens report.`,
      usageMessage,
      licenseMessage,
      unavailableSections.length > 0
        ? `Unavailable sections in this run: ${unavailableSections.join(', ')}.`
        : '',
      'Connect OpenAI to unlock usage, carbon, benchmark, and ESG reporting.',
    ].filter(Boolean).join(' '),
    esgDisclosureText: [
      `${company?.name ?? 'The organisation'} received a partial GreenLens report for this period.`,
      usageMessage,
      'Usage-derived environmental metrics were not calculated because a supported usage provider was not connected.',
      license.availability.status === 'available'
        ? license.totalLicensedSeats > 0
          ? `Billing and seat utilization remained available at ${license.overallUtilizationRate}% across ${license.totalLicensedSeats} seats.`
          : `Modeled AI billing remained available${license.estimatedAnnualSpend != null ? ` at $${license.estimatedAnnualSpend.toLocaleString()} annualized spend.` : '.'}`
        : '',
    ].filter(Boolean).join(' '),
  }
}

// Generates basic strategic output from data without requiring Backboard/LLM
function buildFallbackTranslation(usage: any, carbonWater: any, license: any, stat: any, company: any) {
  const decisions: any[] = []
  const mitigationStrategies: any[] = []

  if ((carbonWater.modelTaskMismatchRate ?? 0) > 20) {
    decisions.push({
      title: 'Right-size models for classification tasks',
      situation: `${carbonWater.modelTaskMismatchRate}% of API calls use frontier models for tasks suited to smaller models. Switching these to efficient alternatives reduces costs and carbon.`,
      carbonSavedKg: carbonWater.carbonSavingsKg,
      waterSavedLiters: carbonWater.waterSavingsLiters,
      financialImpact: 'Significant cost reduction on API spend',
      theDecision: 'Migrate high-volume, low-complexity workflows to smaller model variants.',
      teamEffort: '1-2 weeks for engineering team',
      riskOfInaction: 'Unnecessary API costs continue to compound month over month.',
      urgency: 'Act This Quarter',
      impactScore: 8
    })
  }

  if ((license.potentialAnnualSavings ?? 0) > 0) {
    decisions.push(buildLicenseRightsizingDecision(license))
  }

  if (carbonWater.modelEfficiencyScore != null && carbonWater.modelEfficiencyScore < 60) {
    mitigationStrategies.push(
      {
        strategy: 'Implement model routing by task complexity',
        description: 'Route simple classification and Q&A tasks to small models (gpt-4o-mini, claude-haiku) and reserve frontier models for complex reasoning.',
        expectedScoreImprovement: '+15-25 points in 30 days',
        effort: 'Medium',
        timeframe: '30 days'
      },
      {
        strategy: 'Add prompt caching for repeated queries',
        description: 'Enable prompt caching for your highest-volume use cases to reduce token consumption and carbon per query.',
        expectedScoreImprovement: '+5-10 points in 60 days',
        effort: 'Low',
        timeframe: '60 days'
      },
      {
        strategy: 'Audit and remove unused model integrations',
        description: 'Identify models with low request volume and high per-token cost. Consolidate to fewer, more efficient models.',
        expectedScoreImprovement: '+5-15 points in 90 days',
        effort: 'Low',
        timeframe: '90 days'
      }
    )
  }

  const efficiencyNarrative = carbonWater.modelEfficiencyScore == null
    ? 'No model efficiency score was calculated because no supported usage was recorded in the coverage window.'
    : carbonWater.modelEfficiencyScore < 60
      ? `Model efficiency score of ${carbonWater.modelEfficiencyScore}/100 indicates significant optimisation opportunity.`
      : `Model efficiency score of ${carbonWater.modelEfficiencyScore}/100 is above the 60-point threshold.`

  const narrative = [
    `${company?.name ?? 'Your organisation'} consumed ${carbonWater.totalCarbonKg?.toFixed(1)} kg CO2e and ${carbonWater.totalWaterLiters?.toLocaleString()} liters of water through AI usage this period.`,
    efficiencyNarrative,
    decisions.length > 0 ? `${decisions.length} strategic decision${decisions.length > 1 ? 's' : ''} identified this period.` : ''
  ].filter(Boolean).join(' ')

  return {
    decisions,
    incentivesAndBenefits: [],
    mitigationStrategies,
    hypeCycleContext: 'AI adoption is moving from experimentation toward operational discipline. Organisations that establish usage visibility and efficiency benchmarks now are better positioned as governance expectations mature.',
    executiveNarrative: narrative,
    esgDisclosureText: `${company?.name ?? 'The organisation'} consumed ${carbonWater.totalCarbonKg?.toFixed(1)} kg CO2e and ${carbonWater.totalWaterLiters?.toLocaleString()} liters of water through AI workloads during this reporting period. Calculations use model-specific energy intensity, regional grid carbon intensity, and industry-standard PUE/WUE assumptions.`
  }
}
