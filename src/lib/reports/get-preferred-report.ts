import type { SupabaseClient } from '@supabase/supabase-js'

export async function getPreferredReport(
  supabase: SupabaseClient,
  companyId: string,
  reportId?: string | null
) {
  if (reportId) {
    const { data: requestedReport } = await supabase
      .from('reports')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', reportId)
      .maybeSingle()

    if (requestedReport) {
      return requestedReport
    }
  }

  const { data: latestReport } = await supabase
    .from('reports')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return latestReport ?? null
}
