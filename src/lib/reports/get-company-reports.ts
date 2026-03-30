import type { SupabaseClient } from '@supabase/supabase-js'

export async function getCompanyReports(supabase: SupabaseClient, companyId: string) {
  const { data } = await supabase
    .from('reports')
    .select('id, reporting_period, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(12)
  return (data ?? []) as { id: string; reporting_period: string; created_at: string }[]
}
