import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createAnalysisPollController,
  type AnalysisPollControllerCallbacks,
} from '../src/lib/analysis/polling-controller'
import type { AnalysisJobState } from '../src/lib/analysis/state'

function createManualTimers() {
  let nextId = 1
  const callbacks = new Map<number, () => void>()

  return {
    setTimer(callback: () => void) {
      const id = nextId++
      callbacks.set(id, callback)
      return id as unknown as ReturnType<typeof setTimeout>
    },

    clearTimer(timer: ReturnType<typeof setTimeout>) {
      callbacks.delete(Number(timer))
    },

    flushNext() {
      const next = callbacks.entries().next()
      if (next.done) {
        return false
      }

      const [id, callback] = next.value
      callbacks.delete(id)
      callback()
      return true
    },

    size() {
      return callbacks.size
    },
  }
}

function createCallbackLog() {
  const jobStates: AnalysisJobState[] = []
  const errors: Array<string | null> = []
  const terminalStates: AnalysisJobState[] = []

  const callbacks: AnalysisPollControllerCallbacks = {
    setJobState(jobState) {
      jobStates.push(jobState)
    },
    setError(error) {
      errors.push(error)
    },
    handleTerminalState(jobState) {
      terminalStates.push(jobState)
    },
  }

  return { callbacks, jobStates, errors, terminalStates }
}

async function flushAsyncWork() {
  await Promise.resolve()
  await Promise.resolve()
}

test('createAnalysisPollController keeps an active poll alive when callbacks are updated mid-session', async () => {
  const timers = createManualTimers()
  const firstLog = createCallbackLog()
  const secondLog = createCallbackLog()

  const states: AnalysisJobState[] = [
    {
      jobId: 'job-1',
      status: 'running',
      current_agent: 'usage_analyst',
      error_message: null,
      reportId: null,
    },
    {
      jobId: 'job-1',
      status: 'complete',
      current_agent: null,
      error_message: null,
      reportId: 'report-1',
    },
  ]

  let fetchCount = 0
  const controller = createAnalysisPollController({
    callbacks: firstLog.callbacks,
    fetchStatus: async () => states[fetchCount++]!,
    setTimer: (callback) => timers.setTimer(callback),
    clearTimer: (timer) => timers.clearTimer(timer),
  })

  controller.startPolling('job-1')
  await flushAsyncWork()

  assert.equal(fetchCount, 1)
  assert.deepEqual(firstLog.jobStates, [states[0]])
  assert.equal(timers.size(), 1)

  controller.updateCallbacks(secondLog.callbacks)

  assert.equal(timers.flushNext(), true)
  await flushAsyncWork()

  assert.equal(fetchCount, 2)
  assert.deepEqual(firstLog.terminalStates, [])
  assert.deepEqual(secondLog.jobStates, [states[1]])
  assert.deepEqual(secondLog.terminalStates, [states[1]])
  assert.equal(timers.size(), 0)
})

test('createAnalysisPollController stops polling when the job fails', async () => {
  const timers = createManualTimers()
  const log = createCallbackLog()

  let fetchCount = 0
  const failedState: AnalysisJobState = {
    jobId: 'job-failed',
    status: 'failed',
    current_agent: null,
    error_message: 'Usage collection failed',
    reportId: null,
  }

  const controller = createAnalysisPollController({
    callbacks: log.callbacks,
    fetchStatus: async () => {
      fetchCount += 1
      return failedState
    },
    setTimer: (callback) => timers.setTimer(callback),
    clearTimer: (timer) => timers.clearTimer(timer),
  })

  controller.startPolling('job-failed')
  await flushAsyncWork()

  assert.equal(fetchCount, 1)
  assert.deepEqual(log.jobStates, [failedState])
  assert.deepEqual(log.terminalStates, [failedState])
  assert.equal(timers.size(), 0)
  assert.equal(timers.flushNext(), false)
})

test('createAnalysisPollController stops polling when a completed job already has a report', async () => {
  const timers = createManualTimers()
  const log = createCallbackLog()

  let fetchCount = 0
  const completedState: AnalysisJobState = {
    jobId: 'job-complete',
    status: 'complete',
    current_agent: null,
    error_message: null,
    reportId: 'report-123',
  }

  const controller = createAnalysisPollController({
    callbacks: log.callbacks,
    fetchStatus: async () => {
      fetchCount += 1
      return completedState
    },
    setTimer: (callback) => timers.setTimer(callback),
    clearTimer: (timer) => timers.clearTimer(timer),
  })

  controller.startPolling('job-complete')
  await flushAsyncWork()

  assert.equal(fetchCount, 1)
  assert.deepEqual(log.jobStates, [completedState])
  assert.deepEqual(log.terminalStates, [completedState])
  assert.equal(timers.size(), 0)
  assert.equal(timers.flushNext(), false)
})
