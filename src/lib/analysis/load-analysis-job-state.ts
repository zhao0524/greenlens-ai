import { createAdminClient } from '@/lib/supabase/admin'
import { hydrateAnalysisJobState } from '@/lib/analysis/pipeline-steps'
import type { AnalysisJobState, PersistedAnalysisJob } from '@/lib/analysis/state'

interface AgentNameRow {
  agent_name: string
}

export async function loadAnalysisJobState(
  job: PersistedAnalysisJob
): Promise<AnalysisJobState> {
  const supabase = createAdminClient()

  const [{ data: report, error: reportError }, { data: outputRows, error: outputsError }] = await Promise.all([
    supabase
      .from('reports')
      .select('id')
      .eq('job_id', job.id)
      .maybeSingle(),
    supabase
      .from('agent_outputs')
      .select('agent_name')
      .eq('job_id', job.id),
  ])

  if (reportError) {
    throw new Error(`Failed to load report state for analysis job ${job.id}: ${reportError.message}`)
  }

  if (outputsError) {
    throw new Error(`Failed to load agent outputs for analysis job ${job.id}: ${outputsError.message}`)
  }

  return hydrateAnalysisJobState(
    job,
    report?.id ?? null,
    ((outputRows ?? []) as AgentNameRow[]).map((row) => row.agent_name)
  )
}
