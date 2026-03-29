import { createClient } from '@/lib/supabase/server'
import AnalysisTriggerScreen from '@/components/dashboard/AnalysisTriggerScreen'
import SectionAvailabilityNotice from '@/components/dashboard/SectionAvailabilityNotice'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import { getSectionAvailability } from '@/lib/reports/report-availability'

interface LicensesPageProps {
  searchParams?: Promise<{ reportId?: string }>
}

export default async function LicensesPage({ searchParams }: LicensesPageProps) {
  const requestedReportId = (await searchParams)?.reportId ?? null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user!.id).single()
  const report = await getPreferredReport(supabase, company!.id, requestedReportId)
  const { analysisJob } = await getCompanyAnalysisState(supabase, company!.id)

  if (!report) return <AnalysisTriggerScreen companyId={company!.id} initialJobState={analysisJob} />

  const sectionAvailability = getSectionAvailability(report)
  const licenseAvailable = sectionAvailability.license.status === 'available'
  // license_intelligence is stored as the raw output from runLicenseIntelligence,
  // which uses camelCase field names.
  const license = report.license_intelligence as {
    providers: { provider: string; totalSeats: number; activeSeats: number; dormantSeats: number; utilizationRate: number; estimatedAnnualCost: number | null; potentialSavingsAtRenewal: number | null; recommendation: string }[]
    totalLicensedSeats: number
    totalActiveSeats: number
    totalDormantSeats: number
    overallUtilizationRate: number | null
    estimatedAnnualLicenseCost: number | null
    potentialAnnualSavings: number | null
    renewalAlerts: { provider: string; monthsToRenewal: number; renewalDate: string; actionRequired: string }[]
  } | null

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">License Intelligence</h1>
        <p className="text-gray-400 mt-1">{company!.name} · {report.reporting_period}</p>
      </div>

      {!licenseAvailable && (
        <SectionAvailabilityNotice
          title="License analysis unavailable"
          message={sectionAvailability.license.message ?? 'Connect Microsoft 365 or Google Workspace and rerun analysis to populate this section.'}
        />
      )}

      {/* Top metrics */}
      {licenseAvailable && (
        <>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Utilization Rate</p>
          <p className="text-3xl font-bold text-white mt-1">
            {Math.round(license?.overallUtilizationRate ?? report.license_utilization_rate ?? 0)}%
          </p>
          <p className={`text-xs mt-1 ${(license?.overallUtilizationRate ?? 0) > 75 ? 'text-green-400' : 'text-yellow-400'}`}>
            {(license?.overallUtilizationRate ?? 0) > 75 ? 'Healthy' : 'Below target'}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Seats</p>
          <p className="text-3xl font-bold text-white mt-1">
            {license?.totalLicensedSeats?.toLocaleString() ?? '—'}
          </p>
          <p className="text-gray-500 text-xs mt-1">Licensed</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Dormant Seats</p>
          <p className="text-3xl font-bold text-yellow-400 mt-1">
            {license?.totalDormantSeats?.toLocaleString() ?? '—'}
          </p>
          <p className="text-gray-500 text-xs mt-1">No activity in 30 days</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Annual Savings Potential</p>
          <p className="text-3xl font-bold text-green-400 mt-1">
            {license?.potentialAnnualSavings != null
              ? `$${Math.round(license.potentialAnnualSavings / 1000)}k`
              : '—'}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {license?.potentialAnnualSavings != null
              ? 'at renewal with right-sizing'
              : 'Not modeled for all connected providers'}
          </p>
        </div>
      </div>

      {/* Per-provider breakdown */}
      {license?.providers && license.providers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Provider Breakdown</h2>
          <div className="space-y-4">
            {license.providers.map((p, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <p className="text-white font-semibold">{p.provider}</p>
                    <p className="text-gray-400 text-sm mt-1">{p.recommendation}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-lg font-bold ${p.utilizationRate > 75 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {p.utilizationRate}%
                    </span>
                    <p className="text-gray-500 text-xs">utilization</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Total / Active / Dormant</p>
                    <p className="text-white">{p.totalSeats} / {p.activeSeats} / {p.dormantSeats}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Est. Annual Cost</p>
                    <p className="text-white">
                      {p.estimatedAnnualCost != null ? `$${p.estimatedAnnualCost.toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Savings at Renewal</p>
                    <p className="text-green-400">
                      {p.potentialSavingsAtRenewal != null ? `$${p.potentialSavingsAtRenewal.toLocaleString()}` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Renewal alerts */}
      {license?.renewalAlerts && license.renewalAlerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Upcoming Renewals</h2>
          <div className="space-y-3">
            {license.renewalAlerts.map((alert, i) => (
              <div key={i} className="bg-gray-800 border border-yellow-700 rounded-xl p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-white font-medium">{alert.provider}</p>
                    <p className="text-gray-400 text-sm mt-1">{alert.actionRequired}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="bg-yellow-900 text-yellow-300 text-xs px-2 py-1 rounded-full font-medium">
                      {alert.monthsToRenewal} months
                    </span>
                    <p className="text-gray-500 text-xs mt-1">{alert.renewalDate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost analysis */}
      {license?.estimatedAnnualLicenseCost != null && license?.potentialAnnualSavings != null && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Cost Analysis</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Current annual spend</p>
              <p className="text-white text-lg font-semibold">
                ${license.estimatedAnnualLicenseCost.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Optimised annual spend</p>
              <p className="text-green-400 text-lg font-semibold">
                ${(license.estimatedAnnualLicenseCost - license.potentialAnnualSavings).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!license || license.totalLicensedSeats === 0) && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <p className="text-gray-400">No license data available.</p>
          <p className="text-gray-500 text-sm mt-2">
            Connect Microsoft 365 or Google Workspace to see seat utilization.
          </p>
        </div>
      )}
        </>
      )}
    </div>
  )
}
