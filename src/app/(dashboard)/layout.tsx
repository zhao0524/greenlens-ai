import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import AccountActions from '@/components/dashboard/AccountActions'
import ActiveAnalysisBanner from '@/components/dashboard/ActiveAnalysisBanner'
import ReportAvailabilityBanner from '@/components/dashboard/ReportAvailabilityBanner'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user.id).single()
  if (!company) redirect('/onboarding')

  const { data: latestReport } = await supabase.from('reports')
    .select('reporting_period, report_mode, section_availability, executive_summary')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { analysisJob } = await getCompanyAnalysisState(supabase, company.id)

  return (
    <DashboardShell
      companyName={company.name}
      footerActions={(
        <>
          <Link
            href="/onboarding/connect"
            className="block rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-center text-[11px] text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Integrations
          </Link>
          <AccountActions variant="sidebar" />
        </>
      )}
    >
      <div className="flex min-h-[calc(100vh-2rem)] flex-col">
        <ActiveAnalysisBanner
          analysisJob={analysisJob}
          reportingPeriod={latestReport?.reporting_period}
          executiveSummary={latestReport?.executive_summary}
        />
        <ReportAvailabilityBanner report={latestReport ?? null} />

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </DashboardShell>
  )
}
