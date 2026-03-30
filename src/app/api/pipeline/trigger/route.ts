import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadAnalysisJobState } from '@/lib/analysis/load-analysis-job-state'
import { isActiveAnalysisStatus } from '@/lib/analysis/state'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('supabase_user_id', user.id)
    .single()

  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { data: latestJob } = await supabase
    .from('analysis_jobs')
    .select('id, status, current_agent, error_message, created_at, started_at, completed_at, lease_expires_at, last_progress_at')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestJob) {
    const latestJobState = await loadAnalysisJobState(latestJob)

    if (latestJobState.status === 'failed' && latestJob.status !== 'failed') {
      await supabase
        .from('analysis_jobs')
        .update({
          status: 'failed',
          current_agent: null,
          lease_expires_at: null,
          error_message: latestJobState.error_message,
          completed_at: new Date().toISOString(),
          last_progress_at: new Date().toISOString(),
        })
        .eq('id', latestJob.id)
    }

    if (isActiveAnalysisStatus(latestJobState.status)) {
      return NextResponse.json(latestJobState)
    }
  }

  const { data: job } = await supabase
    .from('analysis_jobs')
    .insert({
      company_id: company.id,
      status: 'pending',
      current_agent: 'usage_analyst',
      lease_expires_at: null,
      last_progress_at: new Date().toISOString(),
      error_message: null,
    })
    .select('id, status, current_agent, error_message, created_at, started_at, completed_at, lease_expires_at, last_progress_at')
    .single()

  if (!job) {
    return NextResponse.json({ error: 'Failed to create analysis job' }, { status: 500 })
  }

  return NextResponse.json(await loadAnalysisJobState(job))
}
