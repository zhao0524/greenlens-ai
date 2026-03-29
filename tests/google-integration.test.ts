import test from 'node:test'
import assert from 'node:assert/strict'

import { DEMO_SENTINEL_GOOGLE } from '../src/lib/demo/fake-data'
import {
  collectPaginatedGoogleItems,
  countDistinctGoogleActivityUsers,
  countDistinctGoogleLicensedUsers,
  describeGoogleApiError,
  getGoogleLicenseActivitySummary,
} from '../src/lib/integrations/google'

test('collectPaginatedGoogleItems follows nextPageToken until every page is collected', async () => {
  const visitedTokens: Array<string | null> = []
  const items = await collectPaginatedGoogleItems({
    label: 'Google test pagination',
    fetchPage: async (pageToken) => {
      visitedTokens.push(pageToken)

      if (pageToken == null) {
        return { items: ['page-1'], nextPageToken: 'page-2' }
      }

      if (pageToken === 'page-2') {
        return { items: ['page-2'], nextPageToken: 'page-3' }
      }

      return { items: ['page-3'] }
    },
    selectItems: (page) => page.items,
  })

  assert.deepEqual(visitedTokens, [null, 'page-2', 'page-3'])
  assert.deepEqual(items, ['page-1', 'page-2', 'page-3'])
})

test('Google license/activity helpers deduplicate repeated users correctly', () => {
  const licensedUsers = countDistinctGoogleLicensedUsers([
    { userId: 'a@example.com' },
    { userId: 'b@example.com' },
    { userId: 'a@example.com' },
  ])
  const activeUsers = countDistinctGoogleActivityUsers([
    { actor: { email: 'a@example.com' } },
    { actor: { email: 'a@example.com' } },
    { actor: { profileId: 'profile-2' } },
    { actor: {} },
  ])

  assert.equal(licensedUsers, 2)
  assert.equal(activeUsers, 2)
})

test('describeGoogleApiError turns timeout and auth failures into actionable messages', () => {
  const timeoutMessage = describeGoogleApiError('Google Gemini activity lookup', {
    isAxiosError: true,
    code: 'ECONNABORTED',
    message: 'timeout exceeded',
  })
  const authMessage = describeGoogleApiError('Google Gemini license lookup', {
    isAxiosError: true,
    message: 'Request failed with status code 403',
    response: {
      status: 403,
      data: {
        error: {
          message: 'insufficient authentication scopes',
        },
      },
    },
  })

  assert.match(timeoutMessage, /timed out after 15s/)
  assert.match(authMessage, /denied by Google \(403\)/)
  assert.match(authMessage, /domain admin account/)
})

test('getGoogleLicenseActivitySummary uses deterministic demo Gemini seat data', async () => {
  const summary = await getGoogleLicenseActivitySummary(DEMO_SENTINEL_GOOGLE)

  assert.equal(summary.totalSeats, 180)
  assert.equal(summary.totalDomainUsers, 420)
  assert.equal(summary.activeSeats, 96)
  assert.equal(summary.dormantSeats, 84)
  assert.equal(summary.utilizationRate, 53)
})
