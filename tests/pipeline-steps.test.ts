import test from 'node:test'
import assert from 'node:assert/strict'

import { hydrateAnalysisJobState, resolveNextPipelineStep } from '../src/lib/analysis/pipeline-steps'
import {
  ANALYSIS_FINALIZING_TIMEOUT_MS,
  ANALYSIS_MAX_JOB_AGE_MS,
  hasAnalysisJobExceededMaxAge,
  hasAnalysisLeaseExpired,
} from '../src/lib/analysis/state'

test('resolveNextPipelineStep advances through the resumable pipeline in order', () => {
  assert.equal(resolveNextPipelineStep([], false), 'usage_analyst')
  assert.equal(resolveNextPipelineStep(['usage_analyst'], false), 'stat_analysis')
  assert.equal(
    resolveNextPipelineStep(
      [
        'usage_analyst',
        'stat_analysis',
        'carbon_water_accountant',
        'license_intelligence',
      ],
      false
    ),
    'strategic_translator'
  )
  assert.equal(
    resolveNextPipelineStep(
      [
        'usage_analyst',
        'stat_analysis',
        'carbon_water_accountant',
        'license_intelligence',
        'strategic_translator',
      ],
      false
    ),
    'synthesis'
  )
  assert.equal(
    resolveNextPipelineStep(
      [
        'usage_analyst',
        'stat_analysis',
        'carbon_water_accountant',
        'license_intelligence',
        'strategic_translator',
      ],
      true
    ),
    null
  )
})

test('hydrateAnalysisJobState derives the next step from completed outputs for active jobs', () => {
  const jobState = hydrateAnalysisJobState(
    {
      id: 'job-1',
      status: 'running',
      current_agent: 'license_intelligence',
      error_message: null,
      created_at: new Date().toISOString(),
      completed_at: null,
      lease_expires_at: null,
      last_progress_at: null,
    },
    null,
    [
      'usage_analyst',
      'stat_analysis',
      'carbon_water_accountant',
      'license_intelligence',
    ]
  )

  assert.equal(jobState.status, 'running')
  assert.equal(jobState.current_agent, 'strategic_translator')
})

test('hydrateAnalysisJobState only returns complete when a report exists', () => {
  const completedAt = new Date().toISOString()
  const finalizingState = hydrateAnalysisJobState(
    {
      id: 'job-2',
      status: 'complete',
      current_agent: null,
      error_message: null,
      created_at: new Date().toISOString(),
      completed_at: completedAt,
    },
    null,
    []
  )

  const completeState = hydrateAnalysisJobState(
    {
      id: 'job-3',
      status: 'complete',
      current_agent: null,
      error_message: null,
      created_at: new Date().toISOString(),
      completed_at: completedAt,
    },
    'report-1',
    []
  )

  assert.equal(finalizingState.status, 'finalizing')
  assert.equal(completeState.status, 'complete')
  assert.equal(completeState.reportId, 'report-1')
})

test('hydrateAnalysisJobState fails finalizing jobs that never receive a report', () => {
  const staleCompletedAt = new Date(Date.now() - ANALYSIS_FINALIZING_TIMEOUT_MS - 1000).toISOString()
  const jobState = hydrateAnalysisJobState(
    {
      id: 'job-4',
      status: 'complete',
      current_agent: null,
      error_message: null,
      created_at: new Date().toISOString(),
      completed_at: staleCompletedAt,
    },
    null,
    []
  )

  assert.equal(jobState.status, 'failed')
})

test('lease and age helpers expose expired claims and over-age jobs for recovery', () => {
  assert.equal(
    hasAnalysisLeaseExpired({
      lease_expires_at: new Date(Date.now() - 1000).toISOString(),
    }),
    true
  )
  assert.equal(
    hasAnalysisJobExceededMaxAge({
      status: 'running',
      created_at: new Date(Date.now() - ANALYSIS_MAX_JOB_AGE_MS - 1000).toISOString(),
    }),
    true
  )
})
