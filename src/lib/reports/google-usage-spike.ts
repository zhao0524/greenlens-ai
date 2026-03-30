import type { PostgrestError } from '@supabase/supabase-js'
import type { ExploratoryGoogleUsageSpike } from '@/lib/integrations/google'

type GoogleUsageSpikeStatus = ExploratoryGoogleUsageSpike['status']

interface RouteUser {
  id: string
}

interface RouteCompany {
  id: string
}

interface RouteReport {
  id: string
  job_id: string | null
}

interface UsageAnalystOutputRow {
  output: unknown
}

interface RouteUserResult {
  data: {
    user: RouteUser | null
  }
}

interface RouteQueryBuilder<TData> {
  eq(column: string, value: unknown): RouteQueryBuilder<TData>
  single(): Promise<{ data: TData | null; error: PostgrestError | null }>
  maybeSingle(): Promise<{ data: TData | null; error: PostgrestError | null }>
}

export interface GoogleUsageSpikeRouteSupabase {
  auth: {
    getUser(): Promise<RouteUserResult>
  }
  from(table: string): {
    select(columns: string): RouteQueryBuilder<RouteCompany | RouteReport | UsageAnalystOutputRow>
  }
}

export interface GoogleUsageSpikeReportPayload {
  reportId: string
  jobId: string
  usageCapability: 'unsupported'
  googleUsageSpike: ExploratoryGoogleUsageSpike
}

export type GoogleUsageSpikeRouteLoadResult =
  | { kind: 'unauthorized' }
  | { kind: 'company_not_found' }
  | { kind: 'not_found' }
  | { kind: 'success'; payload: GoogleUsageSpikeReportPayload }

const VALID_GOOGLE_USAGE_SPIKE_STATUSES = new Set<GoogleUsageSpikeStatus>([
  'disabled',
  'collected',
  'failed',
  'unavailable',
])

function throwIfPostgrestError(error: PostgrestError | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`)
  }
}

function extractGoogleUsageSpike(output: unknown) {
  if (!output || typeof output !== 'object') {
    return null
  }

  const candidate = (output as { googleUsageSpike?: unknown }).googleUsageSpike
  if (!candidate || typeof candidate !== 'object') {
    return null
  }

  const status = (candidate as { status?: unknown }).status
  if (!VALID_GOOGLE_USAGE_SPIKE_STATUSES.has(status as GoogleUsageSpikeStatus)) {
    return null
  }

  return candidate as ExploratoryGoogleUsageSpike
}

function isRouteReport(value: RouteCompany | RouteReport | UsageAnalystOutputRow): value is RouteReport {
  return 'job_id' in value
}

function isRouteCompany(
  value: RouteCompany | RouteReport | UsageAnalystOutputRow
): value is RouteCompany {
  return 'id' in value && !('job_id' in value) && !('output' in value)
}

function isUsageAnalystOutputRow(
  value: RouteCompany | RouteReport | UsageAnalystOutputRow
): value is UsageAnalystOutputRow {
  return 'output' in value
}

export function isGoogleUsageSpikeRouteEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === 'development' || env.ENABLE_GOOGLE_USAGE_SPIKE === 'true'
}

export async function getGoogleUsageSpikeReportPayload(
  supabase: GoogleUsageSpikeRouteSupabase,
  companyId: string,
  reportId: string
): Promise<GoogleUsageSpikeReportPayload | null> {
  const reportQuery = supabase
    .from('reports')
    .select('id, job_id')
    .eq('company_id', companyId)
    .eq('id', reportId)
  const { data: report, error: reportError } = await reportQuery.maybeSingle()

  throwIfPostgrestError(reportError, `Failed to load report ${reportId}`)

  if (!report || !isRouteReport(report) || !report.job_id) {
    return null
  }

  const outputQuery = supabase
    .from('agent_outputs')
    .select('output')
    .eq('job_id', report.job_id)
    .eq('agent_name', 'usage_analyst')
  const { data: outputRow, error: outputError } = await outputQuery.maybeSingle()

  throwIfPostgrestError(outputError, `Failed to load usage analyst output for job ${report.job_id}`)

  if (!outputRow || !isUsageAnalystOutputRow(outputRow)) {
    return null
  }

  const googleUsageSpike = extractGoogleUsageSpike(outputRow.output)
  if (!googleUsageSpike) {
    return null
  }

  return {
    reportId: report.id,
    jobId: report.job_id,
    usageCapability: 'unsupported',
    googleUsageSpike,
  }
}

export async function loadGoogleUsageSpikeRoutePayload(
  supabase: GoogleUsageSpikeRouteSupabase,
  reportId: string
): Promise<GoogleUsageSpikeRouteLoadResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { kind: 'unauthorized' }
  }

  const companyQuery = supabase
    .from('companies')
    .select('id')
    .eq('supabase_user_id', user.id)
  const { data: company, error: companyError } = await companyQuery.single()

  throwIfPostgrestError(companyError, `Failed to load company for user ${user.id}`)

  if (!company || !isRouteCompany(company)) {
    return { kind: 'company_not_found' }
  }

  const payload = await getGoogleUsageSpikeReportPayload(supabase, company.id, reportId)
  if (!payload) {
    return { kind: 'not_found' }
  }

  return {
    kind: 'success',
    payload,
  }
}
