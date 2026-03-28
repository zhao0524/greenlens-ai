export type AnalysisJobStatus = 'pending' | 'running' | 'finalizing' | 'complete' | 'failed'

export interface AnalysisJobState {
  jobId: string
  status: AnalysisJobStatus
  current_agent: string | null
  error_message: string | null
  reportId: string | null
}

interface PersistedAnalysisJob {
  id: string
  status: string
  current_agent: string | null
  error_message: string | null
}

export function buildAnalysisJobState(
  job: PersistedAnalysisJob,
  reportId: string | null = null
): AnalysisJobState {
  const status: AnalysisJobStatus =
    job.status === 'complete' && !reportId
      ? 'finalizing'
      : (job.status as Exclude<AnalysisJobStatus, 'finalizing'>)

  return {
    jobId: job.id,
    status,
    current_agent: job.current_agent,
    error_message: job.error_message,
    reportId,
  }
}

export function isActiveAnalysisStatus(status: AnalysisJobStatus) {
  return status === 'pending' || status === 'running' || status === 'finalizing'
}
