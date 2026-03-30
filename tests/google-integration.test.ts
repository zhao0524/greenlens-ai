import test from 'node:test'
import assert from 'node:assert/strict'

import { DEMO_SENTINEL_GOOGLE } from '../src/lib/demo/fake-data'
import {
  buildExploratoryGoogleUsageSpike,
  collectPaginatedGoogleItems,
  countDistinctGoogleActivityUsers,
  countDistinctGoogleLicensedUsers,
  describeGoogleApiError,
  getExploratoryGoogleUsageSpike,
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

test('buildExploratoryGoogleUsageSpike aggregates Gemini event parameters into daily counts and breakdowns', () => {
  const spike = buildExploratoryGoogleUsageSpike(
    [
      { userId: 'a@example.com' },
      { userId: 'b@example.com' },
    ],
    [
      {
        id: {
          time: '2026-03-01T10:00:00.000Z',
          applicationName: 'gemini_in_workspace_apps',
        },
        actor: {
          email: 'a@example.com',
        },
        events: [
          {
            name: 'feature_utilization',
            parameters: [
              { name: 'action', value: 'prompt_submit' },
              { name: 'app_name', value: 'gmail' },
              { name: 'event_category', value: 'assist' },
              { name: 'feature_source', value: 'side_panel' },
            ],
          },
          {
            name: 'feature_utilization',
            parameters: [
              { name: 'app_name', value: 'gmail' },
            ],
          },
        ],
      },
      {
        id: {
          time: '2026-03-01T16:45:00.000Z',
          applicationName: 'gemini_in_workspace_apps',
        },
        actor: {
          email: 'c@example.com',
        },
        events: [
          {
            name: 'feature_utilization',
            parameters: [
              { name: 'action', value: 'summarize' },
              { name: 'app_name', value: 'docs' },
              { name: 'event_category', value: 'assist' },
              { name: 'feature_source', value: 'toolbar' },
            ],
          },
        ],
      },
      {
        id: {
          time: '2026-03-02T08:15:00.000Z',
          applicationName: 'gemini_in_workspace_apps',
        },
        actor: {
          profileId: 'profile-only-user',
        },
        events: [
          {
            name: 'feature_utilization',
            parameters: [
              { name: 'app_name', value: 'meet' },
              { name: 'event_category', value: 'assist' },
            ],
          },
        ],
      },
    ],
    {
      coverageStart: '2026-03-01',
      coverageEnd: '2026-03-30',
      latestCompleteDay: '2026-03-29',
      asOf: '2026-03-30T12:00:00.000Z',
      sampleLimit: 2,
    }
  )

  assert.equal(spike.status, 'collected')
  assert.equal(spike.totalFeatureEvents, 4)
  assert.equal(spike.distinctActiveUsers, 3)
  assert.equal(spike.distinctLicensedActiveUsers, 1)
  assert.deepEqual(spike.dailyFeatureEvents, [
    { date: '2026-03-01', eventCount: 3 },
    { date: '2026-03-02', eventCount: 1 },
  ])
  assert.deepEqual(
    Object.fromEntries(spike.actionBreakdown.map((bucket) => [bucket.value, bucket.eventCount])),
    {
      prompt_submit: 1,
      summarize: 1,
      unknown: 2,
    }
  )
  assert.deepEqual(
    Object.fromEntries(spike.appBreakdown.map((bucket) => [bucket.value, bucket.eventCount])),
    {
      gmail: 2,
      docs: 1,
      meet: 1,
    }
  )
  assert.equal(spike.sampleEvents.length, 2)
  assert.match(
    spike.normalizationLimits.join(' '),
    /profileId/
  )
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

test('getExploratoryGoogleUsageSpike uses deterministic demo Gemini activity fixtures', async () => {
  const spike = await getExploratoryGoogleUsageSpike(DEMO_SENTINEL_GOOGLE)

  assert.equal(spike.status, 'collected')
  assert.equal(spike.totalFeatureEvents, 192)
  assert.equal(spike.distinctActiveUsers, 96)
  assert.equal(spike.distinctLicensedActiveUsers, 96)
  assert.equal(spike.sampleEvents.length, 5)
})
