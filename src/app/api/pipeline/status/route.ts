import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { advanceAnalysisJob } from '@/lib/agents/orchestrator'
import { loadAnalysisJobState } from '@/lib/analysis/load-analysis-job-state'

export const maxDuration = 120

async function persistDerivedFailure(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  errorMessage: string | null
) {
  await supabase
    .from('analysis_jobs')
    .update({
      status: 'failed',
      current_agent: null,
      lease_expires_at: null,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
      last_progress_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

  const supabase = await createClient()

  const { data: job } = await supabase
    .from('analysis_jobs')
    .select('id, company_id, status, current_agent, error_message, created_at, started_at, completed_at, lease_expires_at, last_progress_at')
    .eq('id', jobId)
    .maybeSingle()

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const initialState = await loadAnalysisJobState(job)
  if (initialState.status === 'failed' && job.status !== 'failed') {
    await persistDerivedFailure(supabase, jobId, initialState.error_message)
    return NextResponse.json(initialState)
  }

  if ((job.status === 'pending' || job.status === 'running') && job.company_id) {
    await advanceAnalysisJob(job.id, job.company_id)
  }

  const { data: refreshedJob } = await supabase
    .from('analysis_jobs')
    .select('id, company_id, status, current_agent, error_message, created_at, started_at, completed_at, lease_expires_at, last_progress_at')
    .eq('id', jobId)
    .maybeSingle()

  if (!refreshedJob) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const nextState = await loadAnalysisJobState(refreshedJob)
  if (nextState.status === 'failed' && refreshedJob.status !== 'failed') {
    await persistDerivedFailure(supabase, jobId, nextState.error_message)
  }

  return NextResponse.json(nextState)
}
