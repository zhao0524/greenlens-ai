import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

  const supabase = await createClient()
  const { data: job } = await supabase.from('analysis_jobs')
    .select('status, current_agent, error_message, completed_at').eq('id', jobId).single()

  if (job?.status === 'complete') {
    const { data: report } = await supabase.from('reports').select('id').eq('job_id', jobId).single()
    return NextResponse.json({ ...job, reportId: report?.id })
  }

  return NextResponse.json(job)
}
