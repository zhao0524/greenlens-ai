/**
 * Demo mode — NovaTech Solutions
 *
 * When the integrations table contains these sentinel tokens, the integration
 * functions short-circuit and return this hardcoded data instead of hitting
 * real external APIs. All downstream agents (carbon math, stat analysis,
 * Backboard LLM, synthesis) run on these numbers exactly as they would on
 * real data. Real integrations with genuine tokens are completely unaffected.
 */

export const DEMO_SENTINEL_OPENAI = 'DEMO_NOVATECH_OPENAI'
export const DEMO_SENTINEL_MICROSOFT = 'DEMO_NOVATECH_MICROSOFT'
export const DEMO_SENTINEL_GOOGLE = 'DEMO_NOVATECH_GOOGLE'

function getDemoRunPhase(demoRunIndex: number) {
  if (demoRunIndex <= 1) return 0
  return (demoRunIndex - 1) % 6
}

function applyRequestDelta<T extends {
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
}>(record: T, requestDelta: number): T {
  if (requestDelta <= 0 || record.totalRequests <= 0) {
    return record
  }

  const avgInputTokens = record.totalInputTokens / record.totalRequests
  const avgOutputTokens = record.totalOutputTokens / record.totalRequests

  return {
    ...record,
    totalRequests: record.totalRequests + requestDelta,
    totalInputTokens: record.totalInputTokens + Math.round(avgInputTokens * requestDelta),
    totalOutputTokens: record.totalOutputTokens + Math.round(avgOutputTokens * requestDelta),
  } as T
}

function applyTrailingDailyDelta(dailyRequestCounts: number[], totalDelta: number) {
  if (totalDelta <= 0) {
    return dailyRequestCounts
  }

  const weights = [0.17, 0.19, 0.2, 0.21, 0.23]
  const nextCounts = [...dailyRequestCounts]
  let appliedDelta = 0

  weights.forEach((weight, index) => {
    const bucketDelta = index === weights.length - 1
      ? totalDelta - appliedDelta
      : Math.round(totalDelta * weight)
    const targetIndex = nextCounts.length - weights.length + index

    nextCounts[targetIndex] += bucketDelta
    appliedDelta += bucketDelta
  })

  return nextCounts
}

// ---------------------------------------------------------------------------
// OpenAI usage — 30-day window
// NovaTech Solutions: ~1,200-person technology company.
// Heavy gpt-4o usage (code generation, doc summarisation) drives a 62%
// frontier-model rate, which the carbon agent will flag as a mismatch
// opportunity worth optimising.
// ---------------------------------------------------------------------------

export function getFakeOpenAIUsage(demoRunIndex: number = 1) {
  const demoRunPhase = getDemoRunPhase(demoRunIndex)
  const gpt4oDelta = demoRunPhase * 150
  const gpt4oMiniDelta = demoRunPhase * 110
  const gpt41MiniDelta = demoRunPhase * 60
  const embeddingDelta = demoRunPhase * 20

  const normalizedUsage = [
    {
      model: 'gpt-4o-2024-08-06',
      provider: 'openai' as const,
      totalRequests: 8200,
      totalInputTokens: 4_200_000,
      totalOutputTokens: 1_600_000,
    },
    {
      model: 'gpt-4o-mini',
      provider: 'openai' as const,
      totalRequests: 7600,
      totalInputTokens: 2_800_000,
      totalOutputTokens: 900_000,
    },
    {
      model: 'gpt-4.1-mini',
      provider: 'openai' as const,
      totalRequests: 4800,
      totalInputTokens: 1_400_000,
      totalOutputTokens: 480_000,
    },
    {
      model: 'text-embedding-3-small',
      provider: 'openai' as const,
      totalRequests: 1400,
      totalInputTokens: 3_200_000,
      totalOutputTokens: 0,
    },
  ].map((record) => {
    if (record.model === 'gpt-4o-2024-08-06') {
      return applyRequestDelta(record, gpt4oDelta)
    }
    if (record.model === 'gpt-4o-mini') {
      return applyRequestDelta(record, gpt4oMiniDelta)
    }
    if (record.model === 'gpt-4.1-mini') {
      return applyRequestDelta(record, gpt41MiniDelta)
    }
    return applyRequestDelta(record, embeddingDelta)
  })

  const dailyRequestCounts = applyTrailingDailyDelta([
    778, 814,
    212, 238, 703, 739, 751, 797, 823,
    241, 264, 718, 762, 788, 830, 851,
    229, 256, 745, 808, 774, 819, 836,
    217, 243, 761, 827, 793, 848, 812,
  ], gpt4oDelta + gpt4oMiniDelta + gpt41MiniDelta + embeddingDelta)

  const today = new Date()
  const utcStartOfToday = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  ))
  const coverageEndDate = new Date(utcStartOfToday.getTime() - 24 * 60 * 60 * 1000)
  const coverageStartDate = new Date(utcStartOfToday.getTime() - 30 * 24 * 60 * 60 * 1000)

  const coverageEnd = coverageEndDate.toISOString().split('T')[0]
  const coverageStart = coverageStartDate.toISOString().split('T')[0]
  const asOf = new Date().toISOString()
  const dailyRequestSeries = dailyRequestCounts.map((requestCount, index) => {
    const date = new Date(coverageStartDate.getTime() + index * 24 * 60 * 60 * 1000)
    return {
      date: date.toISOString().split('T')[0],
      requestCount,
    }
  })

  return {
    normalizedUsage,
    dailyRequestCounts,
    dailyRequestSeries,
    coverageStart,
    coverageEnd,
    latestCompleteDay: coverageEnd,
    asOf,
  }
}

// ---------------------------------------------------------------------------
// Microsoft Copilot license data
// 500 seats licensed, 338 active (67.6% utilisation).
// Renewal in ~5 months → triggers the license agent's renewal alert.
// ---------------------------------------------------------------------------

export function getFakeMicrosoftLicenseDetails() {
  const totalSeats = 500
  const consumedSeats = 338
  return {
    totalSeats,
    consumedSeats,
    utilizationRate: Math.round((consumedSeats / totalSeats) * 100),
    licenses: [
      {
        skuPartNumber: 'MICROSOFT_365_COPILOT',
        prepaidUnits: { enabled: totalSeats },
        consumedUnits: consumedSeats,
        servicePlans: [{ servicePlanName: 'COPILOT_FOR_MICROSOFT365' }],
      },
    ],
    estimatedAnnualCost: totalSeats * 30 * 12,          // $180,000
    potentialSavingsAtRenewal: (totalSeats - consumedSeats) * 30 * 12, // $58,320
  }
}

/**
 * Returns the shape that license-intelligence.ts expects from
 * getMicrosoft365CopilotUsageUserDetail: { value: Array<{ hasCopilotActivity, ... }> }
 */
export function getFakeMicrosoftCopilotUsage() {
  const activeUsers = Array.from({ length: 338 }, (_, i) => ({
    userId: `demo-user-active-${i + 1}`,
    hasCopilotActivity: true,
    copilotLastActivityDate: new Date(
      Date.now() - Math.floor(Math.random() * 28) * 86_400_000
    ).toISOString().split('T')[0],
  }))
  const inactiveUsers = Array.from({ length: 162 }, (_, i) => ({
    userId: `demo-user-inactive-${i + 1}`,
    hasCopilotActivity: false,
    copilotLastActivityDate: null,
  }))
  return { value: [...activeUsers, ...inactiveUsers] }
}

// ---------------------------------------------------------------------------
// Google Workspace Gemini license/activity data
// 180 Gemini seats licensed, 96 distinct active users in the trailing 30 days.
// Domain size is larger than the Gemini deployment to reflect staged rollout.
// ---------------------------------------------------------------------------

export function getFakeGoogleLicenseAssignments() {
  return Array.from({ length: 180 }, (_, index) => ({
    userId: `gemini-user-${index + 1}@novatech.example`,
    skuId: index < 120 ? '1010470003' : '1010470001',
    skuName: index < 120 ? 'Gemini Business' : 'Gemini Enterprise',
    productId: '101047',
    productName: 'Gemini',
  }))
}

export function getFakeGoogleDirectoryUsers() {
  return Array.from({ length: 420 }, (_, index) => ({
    id: `google-user-${index + 1}`,
    primaryEmail: `user-${index + 1}@novatech.example`,
  }))
}

export function getFakeGoogleGeminiActivities() {
  return Array.from({ length: 96 }, (_, index) => {
    const activityDay = ((index % 28) + 1).toString().padStart(2, '0')
    const action = ['prompt_submit', 'summarize', 'draft'][index % 3]
    const appName = ['gmail', 'docs', 'meet'][index % 3]
    const featureSource = ['side_panel', 'toolbar'][index % 2]
    return [
      {
        id: {
          time: `2026-03-${activityDay}T12:00:00.000Z`,
          uniqueQualifier: `activity-${index + 1}-a`,
          applicationName: 'gemini_in_workspace_apps',
        },
        actor: {
          email: `gemini-user-${index + 1}@novatech.example`,
          profileId: `profile-${index + 1}`,
        },
        events: [
          {
            name: 'feature_utilization',
            parameters: [
              { name: 'action', value: action },
              { name: 'app_name', value: appName },
              { name: 'event_category', value: 'assist' },
              { name: 'feature_source', value: featureSource },
            ],
          },
        ],
      },
      {
        id: {
          time: `2026-03-${activityDay}T18:30:00.000Z`,
          uniqueQualifier: `activity-${index + 1}-b`,
          applicationName: 'gemini_in_workspace_apps',
        },
        actor: {
          email: `gemini-user-${index + 1}@novatech.example`,
          profileId: `profile-${index + 1}`,
        },
        events: [
          {
            name: 'feature_utilization',
            parameters: [
              { name: 'action', value: action },
              { name: 'app_name', value: appName },
              { name: 'event_category', value: 'assist' },
              { name: 'feature_source', value: featureSource },
            ],
          },
        ],
      },
    ]
  }).flat()
}
