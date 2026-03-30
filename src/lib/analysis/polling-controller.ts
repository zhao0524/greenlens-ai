import {
  ANALYSIS_POLLING_TIMEOUT_MS,
  ANALYSIS_POLL_INTERVAL_MS,
  type AnalysisJobState,
} from '@/lib/analysis/state'
import {
  hasClientFinalizingTimedOut,
  shouldStopPollingForJob,
} from '@/lib/analysis/polling-policy'
import { shouldApplyPollResponse } from '@/lib/analysis/polling-sequencing'

type TimerHandle = ReturnType<typeof setTimeout>

export interface AnalysisPollControllerCallbacks {
  setJobState(jobState: AnalysisJobState): void
  setError(error: string | null): void
  handleTerminalState(jobState: AnalysisJobState): void
}

interface AnalysisPollControllerOptions {
  callbacks: AnalysisPollControllerCallbacks
  fetchStatus(jobId: string, signal: AbortSignal): Promise<AnalysisJobState>
  now?: () => number
  setTimer?: (callback: () => void, delayMs: number) => TimerHandle
  clearTimer?: (timer: TimerHandle) => void
  createAbortController?: () => AbortController
}

export interface AnalysisPollController {
  updateCallbacks(callbacks: AnalysisPollControllerCallbacks): void
  startPolling(jobId: string): void
  stopPolling(): void
}

const CLIENT_TIMEOUT_MESSAGE =
  'Analysis is taking longer than expected. Please reload the page and try again.'
const CLIENT_FINALIZING_TIMEOUT_MESSAGE =
  'Analysis finished but the report did not update. Please rerun the analysis.'

export function createAnalysisPollController({
  callbacks: initialCallbacks,
  fetchStatus,
  now = () => Date.now(),
  setTimer = (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimer = (timer) => clearTimeout(timer),
  createAbortController = () => new AbortController(),
}: AnalysisPollControllerOptions): AnalysisPollController {
  let callbacks = initialCallbacks
  let pollTimer: TimerHandle | null = null
  let pollAbort: AbortController | null = null
  let pollStartAt: number | null = null
  let pollSession = 0
  let requestToken = 0
  let appliedToken = 0
  let finalizingStartedAt: number | null = null

  const stopPolling = () => {
    pollSession += 1

    if (pollTimer) {
      clearTimer(pollTimer)
      pollTimer = null
    }

    if (pollAbort) {
      pollAbort.abort()
      pollAbort = null
    }

    pollStartAt = null
    finalizingStartedAt = null
  }

  const schedulePoll = (
    jobId: string,
    sessionId: number,
    delayMs: number = ANALYSIS_POLL_INTERVAL_MS
  ) => {
    if (pollTimer) {
      clearTimer(pollTimer)
    }

    pollTimer = setTimer(() => {
      void pollStatus(jobId, sessionId)
    }, delayMs)
  }

  const pollStatus = async (jobId: string, sessionId = pollSession) => {
    if (sessionId !== pollSession) {
      return
    }

    if (pollStartAt && now() - pollStartAt > ANALYSIS_POLLING_TIMEOUT_MS) {
      stopPolling()
      callbacks.setError(CLIENT_TIMEOUT_MESSAGE)
      return
    }

    const requestId = ++requestToken
    const controller = createAbortController()
    pollAbort = controller

    try {
      const data = await fetchStatus(jobId, controller.signal)

      if (!shouldApplyPollResponse(pollSession, sessionId, requestId, appliedToken)) {
        return
      }

      appliedToken = requestId
      callbacks.setJobState(data)

      if (data.status === 'finalizing') {
        finalizingStartedAt ??= now()
      } else {
        finalizingStartedAt = null
      }

      if (hasClientFinalizingTimedOut(finalizingStartedAt, now())) {
        stopPolling()
        callbacks.setError(CLIENT_FINALIZING_TIMEOUT_MESSAGE)
        return
      }

      if (shouldStopPollingForJob(data)) {
        stopPolling()
        callbacks.handleTerminalState(data)
        return
      }

      callbacks.setError(null)
      schedulePoll(jobId, sessionId)
    } catch (pollError) {
      if (controller.signal.aborted || sessionId !== pollSession) {
        return
      }

      stopPolling()
      callbacks.setError(
        pollError instanceof Error ? pollError.message : 'Failed to fetch analysis status'
      )
    } finally {
      if (pollAbort === controller) {
        pollAbort = null
      }
    }
  }

  return {
    updateCallbacks(nextCallbacks) {
      callbacks = nextCallbacks
    },

    startPolling(jobId) {
      stopPolling()
      requestToken = 0
      appliedToken = 0
      pollStartAt = now()
      const sessionId = pollSession
      void pollStatus(jobId, sessionId)
    },

    stopPolling,
  }
}
