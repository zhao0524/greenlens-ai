import { after, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runPipeline } from '@/lib/agents/orchestrator'
import { buildAnalysisJobState } from '@/lib/analysis/state'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: company } = await supabase.from('companies').select('id')
    .eq('supabase_user_id', user.id).single()
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { data: latestJob } = await supabase
    .from('analysis_jobs')
    .select('id, status, current_agent, error_message')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestJob) {
    let reportId: string | null = null

    if (latestJob.status === 'complete') {
      const { data: existingReport } = await supabase
        .from('reports')
        .select('id')
        .eq('job_id', latestJob.id)
        .maybeSingle()

      reportId = existingReport?.id ?? null
    }

    const existingJobState = buildAnalysisJobState(latestJob, reportId)
    if (existingJobState.status === 'pending' || existingJobState.status === 'running' || existingJobState.status === 'finalizing') {
      return NextResponse.json(existingJobState)
    }
  }

  const { data: job } = await supabase.from('analysis_jobs')
    .insert({ company_id: company.id, status: 'pending' })
    .select('id, status, current_agent, error_message')
    .single()

  after(async () => {
    await runPipeline(job!.id, company.id).catch(console.error)
  })

  return NextResponse.json(buildAnalysisJobState(job!, null))
}
