import {
  REPORT_SECTIONS,
  type ProviderAnalysisStatus,
  type ReportMode,
  type ReportSection,
  type SectionAvailability,
} from '@/lib/analysis/provider-status'

interface ReportFreshness {
  latest_complete_day?: string | null
  coverage_end?: string | null
  as_of?: string | null
}

interface ReportExecutiveSummary {
  report_mode?: ReportMode | null
  section_availability?: Partial<Record<ReportSection, Partial<SectionAvailability>>> | null
  provider_statuses?: ProviderAnalysisStatus[] | null
  data_freshness?: ReportFreshness | null
}

export interface ReportLike {
  report_mode?: ReportMode | null
  section_availability?: Partial<Record<ReportSection, Partial<SectionAvailability>>> | null
  executive_summary?: ReportExecutiveSummary | null
}

function defaultSectionMessage(section: ReportSection) {
  if (section === 'license') {
    return 'License analysis is unavailable for this report.'
  }

  return 'Usage-derived analysis is unavailable for this report.'
}

export function formatReportSectionLabel(section: ReportSection) {
  switch (section) {
    case 'carbon_water':
      return 'Carbon & Water'
    case 'model_efficiency':
      return 'Model Efficiency'
    case 'esg':
      return 'ESG Export'
    case 'license':
      return 'License Intelligence'
    case 'benchmark':
      return 'Benchmark'
    case 'usage':
      return 'Usage'
  }
}

export function getReportMode(report: ReportLike | null | undefined): ReportMode {
  return report?.report_mode
    ?? report?.executive_summary?.report_mode
    ?? 'full'
}

export function getSectionAvailability(report: ReportLike | null | undefined) {
  const rawAvailability = report?.section_availability
    ?? report?.executive_summary?.section_availability
    ?? {}

  return REPORT_SECTIONS.reduce<Record<ReportSection, SectionAvailability>>((accumulator, section) => {
    const rawSection = rawAvailability?.[section]

    accumulator[section] = {
      status: rawSection?.status === 'available' ? 'available' : 'unavailable',
      message: rawSection?.message ?? defaultSectionMessage(section),
    }

    return accumulator
  }, {} as Record<ReportSection, SectionAvailability>)
}

export function isReportSectionAvailable(
  report: ReportLike | null | undefined,
  section: ReportSection
) {
  return getSectionAvailability(report)[section].status === 'available'
}

export function getUnavailableReportSections(report: ReportLike | null | undefined) {
  const sectionAvailability = getSectionAvailability(report)

  return REPORT_SECTIONS.filter((section) => sectionAvailability[section].status === 'unavailable')
}

export function getReportProviderStatuses(report: ReportLike | null | undefined) {
  return report?.executive_summary?.provider_statuses ?? []
}

export function getReportFreshness(report: ReportLike | null | undefined) {
  return report?.executive_summary?.data_freshness ?? null
}
