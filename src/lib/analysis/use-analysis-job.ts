'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isActiveAnalysisStatus,
  type AnalysisJobState,
} from '@/lib/analysis/state'
import { getAnalysisStatusMessage } from '@/lib/analysis/polling-policy'
import { createAnalysisPollController } from '@/lib/analysis/polling-controller'

interface UseAnalysisJobOptions {
  initialJobState?: AnalysisJobState | null
  onComplete?: (jobState: AnalysisJobState) => void
}

export function useAnalysisJob({
  initialJobState = null,
  onComplete,
}: UseAnalysisJobOptions) {
  const [jobState, setJobState] = useState<AnalysisJobState | null>(initialJobState)
  const [error, setError] = useState<string | null>(initialJobState?.error_message ?? null)
  const onCompleteRef = useRef(onComplete)
  const pollControllerRef = useRef<ReturnType<typeof createAnalysisPollController> | null>(null)
  const resumedInitialJobIdRef = useRef<string | null>(null)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const handleTerminalState = useCallback((nextState: AnalysisJobState) => {
    if (nextState.status === 'failed') {
      setError(nextState.error_message ?? 'Analysis failed')
      return
    }

    setError(null)
    if (nextState.status === 'complete' && nextState.reportId) {
      onCompleteRef.current?.(nextState)
    }
  }, [])

  if (!pollControllerRef.current) {
    pollControllerRef.current = createAnalysisPollController({
      callbacks: {
        setJobState,
        setError,
        handleTerminalState,
      },
      fetchStatus: async (jobId, signal) => {
        const response = await fetch(`/api/pipeline/status?jobId=${jobId}`, {
          cache: 'no-store',
          signal,
        })

        if (!response.ok) {
          throw new Error('Failed to fetch analysis status')
        }

        return await response.json() as AnalysisJobState
      },
    })
  }

  useEffect(() => {
    pollControllerRef.current?.updateCallbacks({
      setJobState,
      setError,
      handleTerminalState,
    })
  }, [handleTerminalState])

  const triggerAnalysis = useCallback(async () => {
    pollControllerRef.current?.stopPolling()
    setError(null)

    try {
      const response = await fetch('/api/pipeline/trigger', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to start analysis')

      const data = await response.json() as AnalysisJobState
      setJobState(data)

      if (data.status === 'complete' && data.reportId) {
        handleTerminalState(data)
        return
      }

      if (isActiveAnalysisStatus(data.status)) {
        resumedInitialJobIdRef.current = data.jobId
        pollControllerRef.current?.startPolling(data.jobId)
      }
    } catch (triggerError) {
      setError(triggerError instanceof Error ? triggerError.message : 'Failed to start analysis')
    }
  }, [handleTerminalState])

  useEffect(() => {
    setJobState(initialJobState)
    setError(initialJobState?.error_message ?? null)
  }, [initialJobState])

  useEffect(() => {
    if (!initialJobState || !isActiveAnalysisStatus(initialJobState.status)) {
      resumedInitialJobIdRef.current = null
      return
    }

    if (resumedInitialJobIdRef.current === initialJobState.jobId) {
      return
    }

    resumedInitialJobIdRef.current = initialJobState.jobId
    pollControllerRef.current?.startPolling(initialJobState.jobId)
  }, [initialJobState])

  useEffect(() => {
    return () => {
      pollControllerRef.current?.stopPolling()
    }
  }, [])

  const status = jobState?.status ?? null
  const loading = status ? isActiveAnalysisStatus(status) : false
  const statusMessage = getAnalysisStatusMessage(jobState)

  return {
    error,
    jobState,
    loading,
    status,
    statusMessage,
    triggerAnalysis,
    isActive: status ? isActiveAnalysisStatus(status) : false,
  }
}
