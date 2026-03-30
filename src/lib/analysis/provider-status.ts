export type AnalysisCapability = 'usage' | 'license'
export type ProviderAnalysisStatusKind = 'fresh' | 'failed' | 'unsupported'
export type ReportMode = 'full' | 'partial'
export type SectionAvailabilityKind = 'available' | 'unavailable'

export const REPORT_SECTIONS = [
  'usage',
  'carbon_water',
  'model_efficiency',
  'benchmark',
  'esg',
  'license',
] as const

export type ReportSection = (typeof REPORT_SECTIONS)[number]

export interface SectionAvailability {
  status: SectionAvailabilityKind
  message: string | null
}

export interface ReportAvailability {
  reportMode: ReportMode
  sectionAvailability: Record<ReportSection, SectionAvailability>
}

export interface ProviderAnalysisStatus {
  provider: string
  capability: AnalysisCapability
  status: ProviderAnalysisStatusKind
  message: string | null
  coverageStart: string | null
  coverageEnd: string | null
  latestCompleteDay: string | null
  asOf: string | null
}

export interface DataFreshness {
  coverageStart: string | null
  coverageEnd: string | null
  latestCompleteDay: string | null
  asOf: string | null
}

interface BuildProviderStatusOptions {
  provider: string
  capability: AnalysisCapability
  status: ProviderAnalysisStatusKind
  message?: string | null
  coverageStart?: string | null
  coverageEnd?: string | null
  latestCompleteDay?: string | null
  asOf?: string | null
}

export function supportsProviderCapability(
  provider: string,
  capability: AnalysisCapability
) {
  if (capability === 'usage') {
    return provider === 'openai'
  }

  return provider === 'microsoft' || provider === 'google'
}

export function buildSectionAvailability(
  status: SectionAvailabilityKind,
  message: string | null = null
): SectionAvailability {
  return { status, message }
}

export function buildAvailableSection(message: string | null = null) {
  return buildSectionAvailability('available', message)
}

export function buildUnavailableSection(message: string) {
  return buildSectionAvailability('unavailable', message)
}

export function buildReportAvailability({
  usage,
  license,
}: {
  usage: SectionAvailability
  license: SectionAvailability
}): ReportAvailability {
  const usageUnavailableMessage =
    usage.message ?? 'Connect a supported usage provider to unlock these sections.'

  return {
    reportMode: usage.status === 'available' ? 'full' : 'partial',
    sectionAvailability: {
      usage: { ...usage },
      carbon_water: usage.status === 'available'
        ? buildAvailableSection('Calculated from supported provider usage data.')
        : buildUnavailableSection(usageUnavailableMessage),
      model_efficiency: usage.status === 'available'
        ? buildAvailableSection('Derived from supported provider usage data.')
        : buildUnavailableSection(usageUnavailableMessage),
      benchmark: usage.status === 'available'
        ? buildAvailableSection('Benchmarked against supported provider usage data.')
        : buildUnavailableSection(usageUnavailableMessage),
      esg: usage.status === 'available'
        ? buildAvailableSection('Derived from supported provider usage and environmental calculations.')
        : buildUnavailableSection(usageUnavailableMessage),
      license: { ...license },
    },
  }
}

function minIso(left: string | null, right: string | null) {
  if (!left) return right
  if (!right) return left
  return left < right ? left : right
}

function maxIso(left: string | null, right: string | null) {
  if (!left) return right
  if (!right) return left
  return left > right ? left : right
}

export function buildProviderStatus({
  provider,
  capability,
  status,
  message = null,
  coverageStart = null,
  coverageEnd = null,
  latestCompleteDay = coverageEnd,
  asOf = null,
}: BuildProviderStatusOptions): ProviderAnalysisStatus {
  return {
    provider,
    capability,
    status,
    message,
    coverageStart,
    coverageEnd,
    latestCompleteDay,
    asOf,
  }
}

export function deriveDataFreshness(statuses: ProviderAnalysisStatus[]): DataFreshness {
  const freshUsageStatuses = statuses.filter((status) =>
    status.status === 'fresh' && status.capability === 'usage'
  )
  const freshStatuses = freshUsageStatuses.length > 0
    ? freshUsageStatuses
    : statuses.filter((status) => status.status === 'fresh')

  return freshStatuses.reduce<DataFreshness>(
    (accumulator, status) => ({
      coverageStart: minIso(accumulator.coverageStart, status.coverageStart),
      coverageEnd: maxIso(accumulator.coverageEnd, status.coverageEnd),
      latestCompleteDay: maxIso(accumulator.latestCompleteDay, status.latestCompleteDay),
      asOf: maxIso(accumulator.asOf, status.asOf),
    }),
    {
      coverageStart: null,
      coverageEnd: null,
      latestCompleteDay: null,
      asOf: null,
    }
  )
}

export function buildUnsupportedProviderStatus(
  provider: string,
  capability: AnalysisCapability,
  message: string
) {
  return buildProviderStatus({
    provider,
    capability,
    status: 'unsupported',
    message,
    asOf: new Date().toISOString(),
  })
}
