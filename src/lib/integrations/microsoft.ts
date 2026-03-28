import axios from 'axios'

const MICROSOFT_API_TIMEOUT_MS = 15000

interface MicrosoftServicePlan {
  servicePlanName?: string
}

interface MicrosoftSku {
  skuPartNumber?: string
  servicePlans?: MicrosoftServicePlan[]
  prepaidUnits?: {
    enabled?: number
  }
  consumedUnits?: number
}

export async function getMicrosoftAccessToken(tenantId: string, clientId: string, clientSecret: string) {
  const response = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default'
    }),
    { timeout: MICROSOFT_API_TIMEOUT_MS }
  )
  return response.data.access_token
}

// Microsoft Graph Reports API.
// Returns aggregate organizational Copilot utilization.
// Collection methodology: Microsoft Graph Reports API (getMicrosoft365CopilotUsageUserDetail).
// This returns per-user activity flags (active/inactive), NOT message content.
// Individual user prompts, responses, or conversation content are never accessible
// through this API. This is organizational-level deployment data, not individual surveillance.
export async function getMicrosoftCopilotUsage(accessToken: string) {
  const response = await axios.get(
    `https://graph.microsoft.com/v1.0/reports/getMicrosoft365CopilotUsageUserDetail(period='D30')`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: MICROSOFT_API_TIMEOUT_MS
    }
  )
  return response.data
}

export async function getMicrosoftLicenseDetails(accessToken: string) {
  const response = await axios.get(
    'https://graph.microsoft.com/v1.0/subscribedSkus',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: MICROSOFT_API_TIMEOUT_MS
    }
  )
  const skus: MicrosoftSku[] = response.data.value ?? []
  const copilotLicenses = skus.filter((sku: MicrosoftSku) =>
    sku.skuPartNumber?.includes('COPILOT') ||
    sku.servicePlans?.some((plan: MicrosoftServicePlan) => plan.servicePlanName?.includes('COPILOT'))
  )
  const totalSeats = copilotLicenses.reduce((sum: number, sku: MicrosoftSku) => sum + (sku.prepaidUnits?.enabled || 0), 0)
  const consumedSeats = copilotLicenses.reduce((sum: number, sku: MicrosoftSku) => sum + (sku.consumedUnits || 0), 0)
  return {
    totalSeats,
    consumedSeats,
    utilizationRate: totalSeats > 0 ? Math.round((consumedSeats / totalSeats) * 100) : 0,
    licenses: copilotLicenses,
    estimatedAnnualCost: totalSeats * 30 * 12,
    potentialSavingsAtRenewal: (totalSeats - consumedSeats) * 30 * 12
  }
}
