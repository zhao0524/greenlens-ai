import {
  formatReportSectionLabel,
  getReportMode,
  getReportProviderStatuses,
  getSectionAvailability,
  type ReportLike,
} from '@/lib/reports/report-availability'
import { REPORT_SECTIONS, type ReportSection } from '@/lib/analysis/provider-status'

interface ReportAvailabilityBannerProps {
  report: ReportLike | null
}

function listSections(
  sections: ReportSection[],
  sectionAvailability: ReturnType<typeof getSectionAvailability>
) {
  return sections.map((section) => {
    const label = formatReportSectionLabel(section)
    const message = sectionAvailability[section].message
    return message ? `${label}: ${message}` : label
  })
}

export default function ReportAvailabilityBanner({ report }: ReportAvailabilityBannerProps) {
  if (!report || getReportMode(report) !== 'partial') {
    return null
  }

  const sectionAvailability = getSectionAvailability(report)
  const availableSections = REPORT_SECTIONS.filter((section) =>
    sectionAvailability[section].status === 'available'
  )
  const unavailableSections = REPORT_SECTIONS.filter((section) =>
    sectionAvailability[section].status === 'unavailable'
  )
  const unsupportedProviderNotes = [...new Set(
    getReportProviderStatuses(report)
      .filter((status) => status.status === 'unsupported' && Boolean(status.message))
      .map((status) => status.message as string)
  )]

  return (
    <div className="mx-4 mt-4 rounded-[24px] border border-amber-200 bg-[#fffaf0] px-5 py-4 lg:mx-6">
      <p className="text-sm font-medium text-amber-950">
        This report is partial. GreenLens only populated the sections backed by supported providers in this run.
      </p>
      {availableSections.length > 0 && (
        <p className="mt-2 text-sm text-amber-800">
          Available: {availableSections.map((section) => formatReportSectionLabel(section)).join(', ')}.
        </p>
      )}
      {unavailableSections.length > 0 && (
        <div className="mt-2 space-y-1">
          {listSections(unavailableSections, sectionAvailability).map((entry) => (
            <p key={entry} className="text-sm text-amber-800/90">
              {entry}
            </p>
          ))}
        </div>
      )}
      {unsupportedProviderNotes.length > 0 && (
        <div className="mt-2 space-y-1">
          {unsupportedProviderNotes.slice(0, 3).map((note) => (
            <p key={note} className="text-xs text-amber-700/85">
              {note}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
