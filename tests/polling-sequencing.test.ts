import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldApplyPollResponse } from '../src/lib/analysis/polling-sequencing'

test('shouldApplyPollResponse rejects stale tokens and stale sessions', () => {
  assert.equal(shouldApplyPollResponse(3, 3, 2, 1), true)
  assert.equal(shouldApplyPollResponse(3, 3, 1, 2), false)
  assert.equal(shouldApplyPollResponse(3, 2, 5, 4), false)
})
