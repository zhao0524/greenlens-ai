import axios from 'axios'

const GOOGLE_API_TIMEOUT_MS = 15000

export async function getGoogleAccessToken(code: string, redirectUri: string) {
  const response = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri
    }),
    { timeout: GOOGLE_API_TIMEOUT_MS }
  )
  return response.data
}

// Google Workspace Admin SDK — Directory API.
// Returns aggregate license counts for Gemini for Workspace SKUs.
// No individual user content, messages, or prompts are accessible through this API.
// This is organizational-level license deployment data only.
export async function getGoogleWorkspaceLicenses(accessToken: string) {
  const response = await axios.get(
    'https://www.googleapis.com/admin/directory/v1/resellernotify/getwatchdetails',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: GOOGLE_API_TIMEOUT_MS
    }
  )

  // Fetch SKUs for Gemini/AI products via Enterprise License Manager API
  const skusResponse = await axios.get(
    'https://www.googleapis.com/apps/licensing/v1/product/Google-Apps/sku',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: GOOGLE_API_TIMEOUT_MS
    }
  )

  return {
    skus: skusResponse.data.items || [],
    watchDetails: response.data
  }
}

export async function getGoogleDomainUsers(accessToken: string) {
  // Returns aggregate user count only — no individual user data
  const response = await axios.get(
    'https://www.googleapis.com/admin/directory/v1/users',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { customer: 'my_customer', maxResults: 1, fields: 'nextPageToken' },
      timeout: GOOGLE_API_TIMEOUT_MS
    }
  )
  return response.data
}
