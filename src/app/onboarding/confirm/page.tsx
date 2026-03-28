import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyAnalysisState } from '@/lib/analysis/get-company-analysis-state'
import ConfirmPageClient from '@/components/onboarding/ConfirmPageClient'

export default async function ConfirmPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, industry, headcount_range')
    .eq('supabase_user_id', user.id)
    .single()

  if (!company) redirect('/onboarding')

  const { data: integrations } = await supabase
    .from('integrations')
    .select('provider, is_active')
    .eq('company_id', company.id)

  const { analysisJob } = await getCompanyAnalysisState(supabase, company.id)

  return (
    <ConfirmPageClient
      company={company}
      integrations={integrations ?? []}
      initialJobState={analysisJob}
    />
  )
}
