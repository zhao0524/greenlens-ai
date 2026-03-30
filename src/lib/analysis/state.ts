export type AnalysisJobStatus = 'pending' | 'running' | 'finalizing' | 'complete' | 'failed'

export const ANALYSIS_POLL_INTERVAL_MS = 500
export const ANALYSIS_POLLING_TIMEOUT_MS = 6 * 60 * 1000
export const ANALYSIS_FINALIZING_TIMEOUT_MS = 15 * 1000
export const ANALYSIS_LEASE_TTL_MS = 60 * 1000
export const ANALYSIS_MAX_JOB_AGE_MS = 15 * 60 * 1000
export const ANALYSIS_FINALIZING_TIMEOUT_MESSAGE =
  'Analysis finished but the report was not written successfully. Please rerun the analysis.'
export const ANALYSIS_MAX_AGE_TIMEOUT_MESSAGE =
  'Analysis took too long to finish. Please rerun the analysis.'

export interface AnalysisJobState {
  jobId: string
  status: AnalysisJobStatus
  current_agent: string | null
  error_message: string | null
  reportId: string | null
}

export interface PersistedAnalysisJob {
  id: string
  status: string
  current_agent: string | null
  error_message: string | null
  created_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  lease_expires_at?: string | null
  last_progress_at?: string | null
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

export function hasAnalysisLeaseExpired(
  job: Pick<PersistedAnalysisJob, 'lease_expires_at'>,
  nowMs: number = Date.now()
) {
  if (!job.lease_expires_at) return false

  const leaseExpiresAtMs = new Date(job.lease_expires_at).getTime()
  if (!Number.isFinite(leaseExpiresAtMs)) return false

  return nowMs >= leaseExpiresAtMs
}

export function hasAnalysisJobExceededMaxAge(
  job: Pick<PersistedAnalysisJob, 'status'> & {
    created_at?: string | null
  },
  nowMs: number = Date.now()
) {
  if (job.status !== 'pending' && job.status !== 'running') return false
  if (!job.created_at) return false

  const createdAtMs = new Date(job.created_at).getTime()
  if (!Number.isFinite(createdAtMs)) return false

  return nowMs - createdAtMs > ANALYSIS_MAX_JOB_AGE_MS
}

export function isClaimableActiveAnalysisJob(
  job: Pick<PersistedAnalysisJob, 'status' | 'lease_expires_at'>,
  nowMs: number = Date.now()
) {
  if (job.status !== 'pending' && job.status !== 'running') return false
  return !job.lease_expires_at || hasAnalysisLeaseExpired(job, nowMs)
}

export function hasFinalizingTimedOut(
  job: Pick<PersistedAnalysisJob, 'status' | 'completed_at'>,
  reportId: string | null
) {
  if (job.status !== 'complete' || reportId) return false
  if (!job.completed_at) return false

  const completedAtMs = new Date(job.completed_at).getTime()
  if (!Number.isFinite(completedAtMs)) return false

  return Date.now() - completedAtMs > ANALYSIS_FINALIZING_TIMEOUT_MS
}

export function buildFailedAnalysisJobState(jobId: string, errorMessage: string): AnalysisJobState {
  return {
    jobId,
    status: 'failed',
    current_agent: null,
    error_message: errorMessage,
    reportId: null,
  }
}
