'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isActiveAnalysisStatus,
  type AnalysisJobState,
} from '@/lib/analysis/state'

interface UseAnalysisJobOptions {
  initialJobState?: AnalysisJobState | null
  onComplete?: (jobState: AnalysisJobState) => void
}

const AGENT_LABELS: Record<string, string> = {
  usage_analyst: 'Collecting usage data',
  stat_analysis: 'Running statistical analysis',
  carbon_water_accountant: 'Calculating carbon and water impact',
  license_intelligence: 'Reviewing license utilization',
  strategic_translator: 'Generating strategic recommendations',
  synthesis: 'Finalizing your report',
}

function getStatusMessage(jobState: AnalysisJobState | null) {
  if (!jobState) return null
  if (jobState.status === 'pending') return 'Queued and about to begin.'
  if (jobState.status === 'finalizing') return 'Finalizing your report.'
  if (jobState.current_agent) {
    return AGENT_LABELS[jobState.current_agent] ?? 'Analysis in progress.'
  }
  if (jobState.status === 'running') return 'Analysis in progress.'
  if (jobState.status === 'failed') return jobState.error_message ?? 'Analysis failed.'
  return null
}

export function useAnalysisJob({
  initialJobState = null,
  onComplete,
}: UseAnalysisJobOptions) {
  const [jobState, setJobState] = useState<AnalysisJobState | null>(initialJobState)
  const [error, setError] = useState<string | null>(initialJobState?.error_message ?? null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  const handleTerminalState = useCallback((nextState: AnalysisJobState) => {
    setJobState(nextState)
    if (nextState.status === 'failed') {
      setError(nextState.error_message ?? 'Analysis failed')
      return
    }

    setError(null)
    if (nextState.status === 'complete' && nextState.reportId) {
      onComplete?.(nextState)
    }
  }, [onComplete])

  const pollStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/pipeline/status?jobId=${jobId}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch analysis status')

      const data = await response.json() as AnalysisJobState
      setJobState(data)

      if (data.status === 'failed' || (data.status === 'complete' && data.reportId)) {
        stopPolling()
        handleTerminalState(data)
        return
      }

      setError(null)
    } catch (pollError) {
      stopPolling()
      setError(pollError instanceof Error ? pollError.message : 'Failed to fetch analysis status')
    }
  }, [handleTerminalState, stopPolling])

  const startPolling = useCallback((jobId: string) => {
    stopPolling()
    void pollStatus(jobId)
    pollIntervalRef.current = setInterval(() => {
      void pollStatus(jobId)
    }, 3000)
  }, [pollStatus, stopPolling])

  const triggerAnalysis = useCallback(async () => {
    stopPolling()
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
        startPolling(data.jobId)
      }
    } catch (triggerError) {
      setError(triggerError instanceof Error ? triggerError.message : 'Failed to start analysis')
    }
  }, [handleTerminalState, startPolling, stopPolling])

  useEffect(() => {
    setJobState(initialJobState)
    setError(initialJobState?.error_message ?? null)
  }, [initialJobState])

  useEffect(() => {
    if (initialJobState && isActiveAnalysisStatus(initialJobState.status)) {
      startPolling(initialJobState.jobId)
    }

    return () => {
      stopPolling()
    }
  }, [initialJobState, startPolling, stopPolling])

  const status = jobState?.status ?? null
  const loading = status ? isActiveAnalysisStatus(status) : false
  const statusMessage = getStatusMessage(jobState)

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
