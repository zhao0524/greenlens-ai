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
const GOOGLE_USAGE_SPIKE_SAMPLE_LIMIT = 5
const UNKNOWN_GOOGLE_ACTIVITY_VALUE = 'unknown'

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

export interface GoogleActivityEventParameter {
  name?: string
  value?: string
  intValue?: string | number
  boolValue?: boolean
  multiValue?: string[]
  messageValue?: {
    parameter?: Array<{
      name?: string
      value?: string
    }>
  }
}

export interface GoogleActivityEvent {
  type?: string
  name?: string
  parameters?: GoogleActivityEventParameter[]
}

export interface GoogleActivityItem {
  id?: GoogleActivityId
  actor?: GoogleActivityActor
  events?: GoogleActivityEvent[]
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

export type GoogleUsageSpikeStatus = 'disabled' | 'collected' | 'failed' | 'unavailable'

export interface GoogleUsageSpikeDailyEventCount {
  date: string
  eventCount: number
}

export interface GoogleUsageSpikeBreakdownBucket {
  value: string
  eventCount: number
}

export interface GoogleUsageSpikeSampleEvent {
  time: string | null
  eventName: string
  actorKey: string | null
  actorEmail: string | null
  applicationName: string | null
  parameters: Record<string, string>
}

export interface ExploratoryGoogleUsageSpike {
  status: GoogleUsageSpikeStatus
  message: string
  coverageStart: string | null
  coverageEnd: string | null
  latestCompleteDay: string | null
  asOf: string | null
  totalFeatureEvents: number
  distinctActiveUsers: number
  distinctLicensedActiveUsers: number
  dailyFeatureEvents: GoogleUsageSpikeDailyEventCount[]
  actionBreakdown: GoogleUsageSpikeBreakdownBucket[]
  appBreakdown: GoogleUsageSpikeBreakdownBucket[]
  eventCategoryBreakdown: GoogleUsageSpikeBreakdownBucket[]
  featureSourceBreakdown: GoogleUsageSpikeBreakdownBucket[]
  sampleEvents: GoogleUsageSpikeSampleEvent[]
  normalizationLimits: string[]
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

interface BuildGoogleUsageSpikeOptions {
  coverageStart?: string | null
  coverageEnd?: string | null
  latestCompleteDay?: string | null
  asOf?: string | null
  sampleLimit?: number
}

function formatUtcDate(date: Date) {
  return date.toISOString().split('T')[0] ?? date.toISOString()
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

function normalizeGoogleEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase()
  return normalized || null
}

function normalizeGoogleActivityValue(value: string | number | boolean | null | undefined) {
  if (value == null) {
    return null
  }

  const normalized = String(value).trim().toLowerCase()
  return normalized || null
}

function normalizeGoogleActivityParameterValue(parameter: GoogleActivityEventParameter) {
  const directValue = normalizeGoogleActivityValue(parameter.value)
  if (directValue) {
    return directValue
  }

  const intValue = normalizeGoogleActivityValue(parameter.intValue)
  if (intValue) {
    return intValue
  }

  if (typeof parameter.boolValue === 'boolean') {
    return parameter.boolValue ? 'true' : 'false'
  }

  if (Array.isArray(parameter.multiValue) && parameter.multiValue.length > 0) {
    const values = parameter.multiValue
      .map((value) => normalizeGoogleActivityValue(value))
      .filter((value): value is string => Boolean(value))

    if (values.length > 0) {
      return values.join(',')
    }
  }

  const nestedValues = parameter.messageValue?.parameter
    ?.map((entry) => {
      const name = entry.name?.trim().toLowerCase()
      const value = normalizeGoogleActivityValue(entry.value)
      if (!name || !value) {
        return null
      }

      return `${name}:${value}`
    })
    .filter((value): value is string => Boolean(value))

  if (nestedValues && nestedValues.length > 0) {
    return nestedValues.join(',')
  }

  return null
}

function incrementGoogleBucket(bucket: Map<string, number>, value: string | null | undefined) {
  const normalizedValue = value?.trim() || UNKNOWN_GOOGLE_ACTIVITY_VALUE
  bucket.set(normalizedValue, (bucket.get(normalizedValue) ?? 0) + 1)
}

function sortGoogleBuckets(bucket: Map<string, number>): GoogleUsageSpikeBreakdownBucket[] {
  return [...bucket.entries()]
    .sort(([leftValue, leftCount], [rightValue, rightCount]) =>
      rightCount - leftCount || leftValue.localeCompare(rightValue)
    )
    .map(([value, eventCount]) => ({ value, eventCount }))
}

function getGoogleActivityDate(activity: GoogleActivityItem) {
  const time = activity.id?.time
  if (!time) {
    return null
  }

  const date = time.split('T')[0]
  return date || null
}

export function buildGoogleUsageSpikeWindow(daysBack: number) {
  return {
    coverageStart: formatUtcDate(getUtcDateDaysAgo(daysBack)),
    coverageEnd: formatUtcDate(new Date()),
    latestCompleteDay: formatUtcDate(getUtcDateDaysAgo(1)),
    asOf: new Date().toISOString(),
  }
}

export function normalizeGoogleActivityParameters(
  parameters: GoogleActivityEventParameter[] | undefined
) {
  return (parameters ?? []).reduce<Record<string, string>>((accumulator, parameter) => {
    const name = parameter.name?.trim()
    if (!name) {
      return accumulator
    }

    accumulator[name] =
      normalizeGoogleActivityParameterValue(parameter) ?? UNKNOWN_GOOGLE_ACTIVITY_VALUE

    return accumulator
  }, {})
}

export function buildGoogleUsageSpikeEnvelope(
  status: GoogleUsageSpikeStatus,
  message: string,
  overrides: Partial<Omit<ExploratoryGoogleUsageSpike, 'status' | 'message'>> = {}
): ExploratoryGoogleUsageSpike {
  return {
    status,
    message,
    coverageStart: overrides.coverageStart ?? null,
    coverageEnd: overrides.coverageEnd ?? null,
    latestCompleteDay: overrides.latestCompleteDay ?? null,
    asOf: overrides.asOf ?? null,
    totalFeatureEvents: overrides.totalFeatureEvents ?? 0,
    distinctActiveUsers: overrides.distinctActiveUsers ?? 0,
    distinctLicensedActiveUsers: overrides.distinctLicensedActiveUsers ?? 0,
    dailyFeatureEvents: overrides.dailyFeatureEvents ?? [],
    actionBreakdown: overrides.actionBreakdown ?? [],
    appBreakdown: overrides.appBreakdown ?? [],
    eventCategoryBreakdown: overrides.eventCategoryBreakdown ?? [],
    featureSourceBreakdown: overrides.featureSourceBreakdown ?? [],
    sampleEvents: overrides.sampleEvents ?? [],
    normalizationLimits: overrides.normalizationLimits ?? [],
  }
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
      .map((assignment) => normalizeGoogleEmail(assignment.userId))
      .filter((userId): userId is string => Boolean(userId))
  ).size
}

export function getGoogleActivityActorEmail(activity: GoogleActivityItem) {
  return normalizeGoogleEmail(activity.actor?.email)
}

export function getGoogleActivityUserKey(activity: GoogleActivityItem) {
  return getGoogleActivityActorEmail(activity) ?? activity.actor?.profileId ?? null
}

export function countDistinctGoogleActivityUsers(activities: GoogleActivityItem[]) {
  return new Set(
    activities
      .map((activity) => getGoogleActivityUserKey(activity))
      .filter((userKey): userKey is string => Boolean(userKey))
  ).size
}

export function buildExploratoryGoogleUsageSpike(
  licenseAssignments: GoogleLicenseAssignment[],
  activities: GoogleActivityItem[],
  {
    coverageStart = null,
    coverageEnd = null,
    latestCompleteDay = null,
    asOf = null,
    sampleLimit = GOOGLE_USAGE_SPIKE_SAMPLE_LIMIT,
  }: BuildGoogleUsageSpikeOptions = {}
): ExploratoryGoogleUsageSpike {
  const licensedEmails = new Set(
    licenseAssignments
      .map((assignment) => normalizeGoogleEmail(assignment.userId))
      .filter((userId): userId is string => Boolean(userId))
  )
  const distinctActiveUsers = new Set<string>()
  const distinctLicensedActiveUsers = new Set<string>()
  const dailyFeatureEvents = new Map<string, number>()
  const actionBreakdown = new Map<string, number>()
  const appBreakdown = new Map<string, number>()
  const eventCategoryBreakdown = new Map<string, number>()
  const featureSourceBreakdown = new Map<string, number>()
  const normalizationLimits = new Set<string>()
  const sampleEvents: GoogleUsageSpikeSampleEvent[] = []
  let totalFeatureEvents = 0

  for (const activity of activities) {
    const actorKey = getGoogleActivityUserKey(activity)
    const actorEmail = getGoogleActivityActorEmail(activity)

    if (actorKey) {
      distinctActiveUsers.add(actorKey)
    }

    if (!actorEmail && activity.actor?.profileId) {
      normalizationLimits.add(
        'Some Gemini activity rows only exposed profileId, so licensed-user intersection may undercount active licensed users.'
      )
    }

    const activityDate = getGoogleActivityDate(activity)
    if (!activityDate && activity.id?.time) {
      normalizationLimits.add(
        'Some Gemini activity rows had non-standard timestamps and were excluded from daily rollups.'
      )
    }

    const events = activity.events?.length
      ? activity.events
      : [{ name: 'feature_utilization', parameters: [] }]

    if (!activity.events?.length) {
      normalizationLimits.add(
        'Some Gemini activity rows were missing event parameters and were bucketed under unknown values.'
      )
    }

    if (actorEmail && licensedEmails.has(actorEmail) && events.length > 0) {
      distinctLicensedActiveUsers.add(actorEmail)
    }

    for (const event of events) {
      totalFeatureEvents += 1

      if (activityDate) {
        dailyFeatureEvents.set(
          activityDate,
          (dailyFeatureEvents.get(activityDate) ?? 0) + 1
        )
      }

      const parameters = normalizeGoogleActivityParameters(event.parameters)

      incrementGoogleBucket(actionBreakdown, parameters.action)
      incrementGoogleBucket(appBreakdown, parameters.app_name)
      incrementGoogleBucket(eventCategoryBreakdown, parameters.event_category)
      incrementGoogleBucket(featureSourceBreakdown, parameters.feature_source)

      if (sampleEvents.length < sampleLimit) {
        sampleEvents.push({
          time: activity.id?.time ?? null,
          eventName: event.name?.trim() || 'feature_utilization',
          actorKey,
          actorEmail,
          applicationName: activity.id?.applicationName ?? null,
          parameters,
        })
      }
    }
  }

  if (licensedEmails.size === 0 && totalFeatureEvents > 0) {
    normalizationLimits.add(
      'No Gemini license assignments were returned, so licensed-user intersection could not be validated.'
    )
  }

  const status: GoogleUsageSpikeStatus = totalFeatureEvents > 0 ? 'collected' : 'unavailable'
  const message = totalFeatureEvents > 0
    ? 'Collected exploratory Gemini activity analytics for internal inspection only. Google usage remains unsupported in shipped reports.'
    : 'No Gemini feature_utilization events were returned for the selected window.'

  return buildGoogleUsageSpikeEnvelope(status, message, {
    coverageStart,
    coverageEnd,
    latestCompleteDay,
    asOf,
    totalFeatureEvents,
    distinctActiveUsers: distinctActiveUsers.size,
    distinctLicensedActiveUsers: distinctLicensedActiveUsers.size,
    dailyFeatureEvents: [...dailyFeatureEvents.entries()]
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([date, eventCount]) => ({ date, eventCount })),
    actionBreakdown: sortGoogleBuckets(actionBreakdown),
    appBreakdown: sortGoogleBuckets(appBreakdown),
    eventCategoryBreakdown: sortGoogleBuckets(eventCategoryBreakdown),
    featureSourceBreakdown: sortGoogleBuckets(featureSourceBreakdown),
    sampleEvents,
    normalizationLimits: [...normalizationLimits].sort((left, right) =>
      left.localeCompare(right)
    ),
  })
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

export async function getExploratoryGoogleUsageSpike(
  accessToken: string,
  daysBack: number = 30
) {
  const window = buildGoogleUsageSpikeWindow(daysBack)
  const [licenseAssignments, geminiActivities] = await Promise.all([
    listGoogleGeminiLicenseAssignments(accessToken),
    listGoogleGeminiActivities(accessToken, daysBack),
  ])

  return buildExploratoryGoogleUsageSpike(
    licenseAssignments,
    geminiActivities,
    window
  )
}

// Stage 2 keeps Google usage support non-shipping on purpose. These helpers collect
// internal Gemini activity analytics for inspection, while the product continues to
// treat Google usage-derived reporting as unsupported until normalization is trusted.
