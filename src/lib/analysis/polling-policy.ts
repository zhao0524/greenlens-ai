import {
  ANALYSIS_FINALIZING_TIMEOUT_MS,
  type AnalysisJobState,
} from '@/lib/analysis/state'

export const ANALYSIS_AGENT_LABELS: Record<string, string> = {
  usage_analyst: 'Collecting usage data',
  stat_analysis: 'Running statistical analysis',
  carbon_water_accountant: 'Calculating carbon and water impact',
  license_intelligence: 'Reviewing license utilization',
  strategic_translator: 'Generating strategic recommendations',
  synthesis: 'Finalizing your report',
}

export function getAnalysisStatusMessage(jobState: AnalysisJobState | null) {
  if (!jobState) return null
  if (jobState.status === 'failed') return jobState.error_message ?? 'Analysis failed.'
  if (jobState.status === 'finalizing') return 'Finalizing your report.'
  if (jobState.current_agent) {
    return ANALYSIS_AGENT_LABELS[jobState.current_agent] ?? 'Analysis in progress.'
  }
  if (jobState.status === 'pending') return 'Queued and about to begin.'
  if (jobState.status === 'running') return 'Analysis in progress.'
  return null
}

export function shouldStopPollingForJob(jobState: AnalysisJobState) {
  return jobState.status === 'failed' || (jobState.status === 'complete' && Boolean(jobState.reportId))
}

export function hasClientFinalizingTimedOut(
  finalizingStartedAtMs: number | null,
  nowMs: number = Date.now()
) {
  if (!finalizingStartedAtMs) return false
  return nowMs - finalizingStartedAtMs > ANALYSIS_FINALIZING_TIMEOUT_MS
}
