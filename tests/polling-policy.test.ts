import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAnalysisStatusMessage,
  hasClientFinalizingTimedOut,
  shouldStopPollingForJob,
} from '../src/lib/analysis/polling-policy'
import { ANALYSIS_FINALIZING_TIMEOUT_MS, type AnalysisJobState } from '../src/lib/analysis/state'
import { buildReportNavigationTarget } from '../src/lib/reports/report-navigation'

test('getAnalysisStatusMessage prefers the current step label for resumable pending jobs', () => {
  const jobState: AnalysisJobState = {
    jobId: 'job-1',
    status: 'pending',
    current_agent: 'stat_analysis',
    error_message: null,
    reportId: null,
  }

  assert.equal(getAnalysisStatusMessage(jobState), 'Running statistical analysis')
})

test('shouldStopPollingForJob only stops on failure or a complete job with a report', () => {
  assert.equal(
    shouldStopPollingForJob({
      jobId: 'job-2',
      status: 'complete',
      current_agent: null,
      error_message: null,
      reportId: null,
    }),
    false
  )

  assert.equal(
    shouldStopPollingForJob({
      jobId: 'job-3',
      status: 'complete',
      current_agent: null,
      error_message: null,
      reportId: 'report-1',
    }),
    true
  )
})

test('hasClientFinalizingTimedOut applies the finalizing timeout window', () => {
  const startedAt = Date.now() - ANALYSIS_FINALIZING_TIMEOUT_MS - 500
  assert.equal(hasClientFinalizingTimedOut(startedAt), true)
  assert.equal(hasClientFinalizingTimedOut(Date.now()), false)
})

test('buildReportNavigationTarget preserves existing query params while pinning the completed report', () => {
  assert.equal(
    buildReportNavigationTarget('/dashboard/models', 'tab=usage', 'report-123'),
    '/dashboard/models?tab=usage&reportId=report-123'
  )
})
