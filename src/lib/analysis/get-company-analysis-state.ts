import type { SupabaseClient } from '@supabase/supabase-js'
import { loadAnalysisJobState } from '@/lib/analysis/load-analysis-job-state'
import type { AnalysisJobState } from '@/lib/analysis/state'

interface CompanyAnalysisState {
  analysisJob: AnalysisJobState | null
}

export async function getCompanyAnalysisState(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyAnalysisState> {
  const { data: latestJob } = await supabase
    .from('analysis_jobs')
    .select('id, status, current_agent, error_message, created_at, started_at, completed_at, lease_expires_at, last_progress_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestJob) {
    return { analysisJob: null }
  }

  return {
    analysisJob: await loadAnalysisJobState(latestJob),
  }
}
