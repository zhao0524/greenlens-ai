import type { AnalysisJobState, PersistedAnalysisJob } from '@/lib/analysis/state'
import {
  ANALYSIS_FINALIZING_TIMEOUT_MESSAGE,
  ANALYSIS_MAX_AGE_TIMEOUT_MESSAGE,
  buildAnalysisJobState,
  buildFailedAnalysisJobState,
  hasAnalysisJobExceededMaxAge,
  hasFinalizingTimedOut,
  isActiveAnalysisStatus,
} from '@/lib/analysis/state'

export const PIPELINE_STEPS = [
  'usage_analyst',
  'stat_analysis',
  'carbon_water_accountant',
  'license_intelligence',
  'strategic_translator',
  'synthesis',
] as const

export type PipelineStep = (typeof PIPELINE_STEPS)[number]

export function isPipelineStep(value: string | null | undefined): value is PipelineStep {
  return PIPELINE_STEPS.includes(value as PipelineStep)
}

export function getNextPipelineStep(step: PipelineStep): PipelineStep | null {
  const stepIndex = PIPELINE_STEPS.indexOf(step)
  if (stepIndex < 0 || stepIndex === PIPELINE_STEPS.length - 1) return null
  return PIPELINE_STEPS[stepIndex + 1]
}

export function resolveNextPipelineStep(
  completedAgents: string[],
  hasReport: boolean
): PipelineStep | null {
  for (const step of PIPELINE_STEPS) {
    if (step === 'synthesis') {
      return hasReport ? null : 'synthesis'
    }

    if (!completedAgents.includes(step)) {
      return step
    }
  }

  return hasReport ? null : 'synthesis'
}

export function getEffectiveCurrentAgent(
  job: Pick<PersistedAnalysisJob, 'status' | 'current_agent'>,
  completedAgents: string[],
  reportId: string | null
) {
  if (!isActiveAnalysisStatus(job.status as AnalysisJobState['status'])) {
    return job.current_agent
  }

  return resolveNextPipelineStep(completedAgents, Boolean(reportId))
}

export function hydrateAnalysisJobState(
  job: PersistedAnalysisJob,
  reportId: string | null,
  completedAgents: string[],
  nowMs: number = Date.now()
): AnalysisJobState {
  if (hasAnalysisJobExceededMaxAge(job, nowMs)) {
    return buildFailedAnalysisJobState(job.id, ANALYSIS_MAX_AGE_TIMEOUT_MESSAGE)
  }

  if (hasFinalizingTimedOut(job, reportId)) {
    return buildFailedAnalysisJobState(job.id, ANALYSIS_FINALIZING_TIMEOUT_MESSAGE)
  }

  return buildAnalysisJobState(
    {
      ...job,
      current_agent: getEffectiveCurrentAgent(job, completedAgents, reportId),
    },
    reportId
  )
}
