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

// ---------------------------------------------------------------------------
// OpenAI usage — 30-day window
// NovaTech Solutions: ~1,200-person technology company.
// Heavy gpt-4o usage (code generation, doc summarisation) drives a 62%
// frontier-model rate, which the carbon agent will flag as a mismatch
// opportunity worth optimising.
// ---------------------------------------------------------------------------

export function getFakeOpenAIUsage() {
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
      model: 'gpt-3.5-turbo',
      provider: 'openai' as const,
      totalRequests: 4800,
      totalInputTokens: 1_400_000,
      totalOutputTokens: 480_000,
    },
    {
      model: 'text-embedding-ada-002',
      provider: 'openai' as const,
      totalRequests: 1400,
      totalInputTokens: 3_200_000,
      totalOutputTokens: 0,
    },
  ]

  // 30 daily request counts, index 0 = yesterday, index 29 = 30 days ago.
  // Realistic weekday/weekend pattern for a mid-size tech company.
  const dailyRequestCounts = [
    // Most recent week (working backwards from yesterday = Friday)
    812, 848, 793, 827, 761, 243, 217,
    // Week 2
    836, 819, 774, 808, 745, 256, 229,
    // Week 3
    851, 830, 788, 762, 718, 264, 241,
    // Week 4
    823, 797, 751, 739, 703, 238, 212,
    // Days 29–30 (Mon–Tue)
    814, 778,
  ]

  return { normalizedUsage, dailyRequestCounts }
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
