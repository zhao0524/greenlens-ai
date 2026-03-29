import axios from 'axios'
import {
  DEMO_SENTINEL_GOOGLE,
  getFakeGoogleDirectoryUsers,
  getFakeGoogleGeminiActivities,
  getFakeGoogleLicenseAssignments,
} from '@/lib/demo/fake-data'

const GOOGLE_API_TIMEOUT_MS = 15000
const GOOGLE_PAGINATION_LIMIT = 50
const GOOGLE_GEMINI_PRODUCT_ID = '101047'
const GOOGLE_LICENSE_PAGE_SIZE = 1000
const GOOGLE_USER_PAGE_SIZE = 500
const GOOGLE_ACTIVITY_PAGE_SIZE = 1000

interface GoogleTokenResponse {
  access_token: string
  expires_in?: number
  refresh_token?: string
}

export interface GoogleLicenseAssignment {
  userId?: string
  skuId?: string
  skuName?: string
  productId?: string
  productName?: string
}

interface GoogleLicenseAssignmentsResponse {
  items?: GoogleLicenseAssignment[]
  nextPageToken?: string
}

export interface GoogleDirectoryUser {
  id?: string
  primaryEmail?: string
}

interface GoogleUsersListResponse {
  users?: GoogleDirectoryUser[]
  nextPageToken?: string
}

interface GoogleActivityId {
  time?: string
  uniqueQualifier?: string
  applicationName?: string
}

interface GoogleActivityActor {
  email?: string
  profileId?: string
}

export interface GoogleActivityItem {
  id?: GoogleActivityId
  actor?: GoogleActivityActor
}

interface GoogleActivitiesListResponse {
  items?: GoogleActivityItem[]
  nextPageToken?: string
}

export interface GoogleLicenseActivitySummary {
  totalSeats: number
  totalDomainUsers: number
  activeSeats: number
  dormantSeats: number
  utilizationRate: number
  coverageStart: string
  coverageEnd: string
  latestCompleteDay: string
  asOf: string
}

interface CollectPaginatedGoogleItemsOptions<
  TPage extends { nextPageToken?: string | null },
  TItem,
> {
  fetchPage: (pageToken: string | null) => Promise<TPage>
  selectItems: (page: TPage) => TItem[] | undefined
  label: string
  maxPages?: number
}

function formatUtcDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function getUtcStartOfToday() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function getUtcDateDaysAgo(daysBack: number) {
  const startOfToday = getUtcStartOfToday()
  startOfToday.setUTCDate(startOfToday.getUTCDate() - daysBack)
  return startOfToday
}

function buildGoogleHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

export async function getGoogleAccessToken(code: string, redirectUri: string) {
  const response = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
    }),
    { timeout: GOOGLE_API_TIMEOUT_MS }
  )

  return response.data as GoogleTokenResponse
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
    { timeout: GOOGLE_API_TIMEOUT_MS }
  )

  return response.data as GoogleTokenResponse
}

export function describeGoogleApiError(operation: string, error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
      return `${operation} timed out after ${GOOGLE_API_TIMEOUT_MS / 1000}s.`
    }

    const status = error.response?.status
    const responseData = error.response?.data as
      | {
          error?: string | { message?: string }
          error_description?: string
          message?: string
        }
      | undefined
    const detail = typeof responseData?.error === 'string'
      ? responseData.error
      : responseData?.error?.message
        ?? responseData?.error_description
        ?? responseData?.message

    if (status === 401 || status === 403) {
      return `${operation} was denied by Google (${status}). Reconnect the Google Workspace integration with a domain admin account and rerun the analysis.`
    }

    return detail
      ? `${operation} failed: ${detail}`
      : `${operation} failed: ${error.message}`
  }

  if (error instanceof Error) {
    return `${operation} failed: ${error.message}`
  }

  return `${operation} failed: Unknown Google API error`
}

async function getGoogleJson<T>(
  url: string,
  accessToken: string,
  params: Record<string, string | number | undefined>,
  operation: string
) {
  try {
    const response = await axios.get<T>(url, {
      headers: buildGoogleHeaders(accessToken),
      params,
      timeout: GOOGLE_API_TIMEOUT_MS,
    })

    return response.data
  } catch (error) {
    throw new Error(describeGoogleApiError(operation, error))
  }
}

export async function collectPaginatedGoogleItems<
  TPage extends { nextPageToken?: string | null },
  TItem,
>({
  fetchPage,
  selectItems,
  label,
  maxPages = GOOGLE_PAGINATION_LIMIT,
}: CollectPaginatedGoogleItemsOptions<TPage, TItem>) {
  const items: TItem[] = []
  let pageToken: string | null = null
  let pageCount = 0

  do {
    pageCount += 1
    if (pageCount > maxPages) {
      throw new Error(`${label} pagination exceeded ${maxPages} pages.`)
    }

    const page = await fetchPage(pageToken)
    items.push(...(selectItems(page) ?? []))
    pageToken = page.nextPageToken ?? null
  } while (pageToken)

  return items
}

export function countDistinctGoogleLicensedUsers(assignments: GoogleLicenseAssignment[]) {
  return new Set(
    assignments
      .map((assignment) => assignment.userId)
      .filter((userId): userId is string => Boolean(userId))
  ).size
}

export function getGoogleActivityUserKey(activity: GoogleActivityItem) {
  return activity.actor?.email ?? activity.actor?.profileId ?? null
}

export function countDistinctGoogleActivityUsers(activities: GoogleActivityItem[]) {
  return new Set(
    activities
      .map((activity) => getGoogleActivityUserKey(activity))
      .filter((userKey): userKey is string => Boolean(userKey))
  ).size
}

export async function listGoogleGeminiLicenseAssignments(
  accessToken: string,
  productId: string = GOOGLE_GEMINI_PRODUCT_ID
) {
  if (accessToken === DEMO_SENTINEL_GOOGLE) {
    return getFakeGoogleLicenseAssignments()
  }

  return collectPaginatedGoogleItems({
    label: 'Google Gemini license lookup',
    fetchPage: (pageToken) =>
      getGoogleJson<GoogleLicenseAssignmentsResponse>(
        `https://licensing.googleapis.com/apps/licensing/v1/product/${productId}/users`,
        accessToken,
        {
          maxResults: GOOGLE_LICENSE_PAGE_SIZE,
          pageToken: pageToken ?? undefined,
        },
        'Google Gemini license lookup'
      ),
    selectItems: (page) => page.items ?? [],
  })
}

export async function listGoogleDomainUsers(accessToken: string) {
  if (accessToken === DEMO_SENTINEL_GOOGLE) {
    return getFakeGoogleDirectoryUsers()
  }

  return collectPaginatedGoogleItems({
    label: 'Google Workspace user lookup',
    fetchPage: (pageToken) =>
      getGoogleJson<GoogleUsersListResponse>(
        'https://admin.googleapis.com/admin/directory/v1/users',
        accessToken,
        {
          customer: 'my_customer',
          maxResults: GOOGLE_USER_PAGE_SIZE,
          orderBy: 'email',
          pageToken: pageToken ?? undefined,
          projection: 'basic',
        },
        'Google Workspace user lookup'
      ),
    selectItems: (page) => page.users ?? [],
  })
}

export async function listGoogleGeminiActivities(
  accessToken: string,
  daysBack: number = 30
) {
  if (accessToken === DEMO_SENTINEL_GOOGLE) {
    return getFakeGoogleGeminiActivities()
  }

  return collectPaginatedGoogleItems({
    label: 'Google Gemini activity lookup',
    fetchPage: (pageToken) =>
      getGoogleJson<GoogleActivitiesListResponse>(
        'https://admin.googleapis.com/admin/reports/v1/activity/users/all/applications/gemini_in_workspace_apps',
        accessToken,
        {
          startTime: getUtcDateDaysAgo(daysBack).toISOString(),
          eventName: 'feature_utilization',
          maxResults: GOOGLE_ACTIVITY_PAGE_SIZE,
          pageToken: pageToken ?? undefined,
        },
        'Google Gemini activity lookup'
      ),
    selectItems: (page) => page.items ?? [],
  })
}

export async function getGoogleLicenseActivitySummary(
  accessToken: string,
  daysBack: number = 30
): Promise<GoogleLicenseActivitySummary> {
  const coverageStart = formatUtcDate(getUtcDateDaysAgo(daysBack))
  const coverageEnd = formatUtcDate(new Date())
  const asOf = new Date().toISOString()

  const [licenseAssignments, domainUsers, geminiActivities] = await Promise.all([
    listGoogleGeminiLicenseAssignments(accessToken),
    listGoogleDomainUsers(accessToken),
    listGoogleGeminiActivities(accessToken, daysBack),
  ])

  const totalSeats = countDistinctGoogleLicensedUsers(licenseAssignments)
  const totalDomainUsers = domainUsers.length
  const activeSeats = Math.min(totalSeats, countDistinctGoogleActivityUsers(geminiActivities))
  const dormantSeats = Math.max(totalSeats - activeSeats, 0)

  return {
    totalSeats,
    totalDomainUsers,
    activeSeats,
    dormantSeats,
    utilizationRate: totalSeats > 0 ? Math.round((activeSeats / totalSeats) * 100) : 0,
    coverageStart,
    coverageEnd,
    latestCompleteDay: coverageEnd,
    asOf,
  }
}

// Stage 2 groundwork lives here already: Gemini activity events are collected for
// license utilization, but the app still keeps Google usage support disabled until
// those events can be normalized into a trustworthy usage/carbon model.
