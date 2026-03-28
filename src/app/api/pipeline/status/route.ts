import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildAnalysisJobState } from '@/lib/analysis/state'

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

  const supabase = await createClient()
  const { data: job } = await supabase.from('analysis_jobs')
    .select('id, status, current_agent, error_message, completed_at').eq('id', jobId).maybeSingle()

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  let reportId: string | null = null

  if (job.status === 'complete') {
    const { data: report } = await supabase
      .from('reports')
      .select('id')
      .eq('job_id', jobId)
      .maybeSingle()

    reportId = report?.id ?? null
  }

  return NextResponse.json(buildAnalysisJobState(job, reportId))
}
