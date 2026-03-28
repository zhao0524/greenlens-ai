import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runPipeline } from '@/lib/agents/orchestrator'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: company } = await supabase.from('companies').select('id')
    .eq('supabase_user_id', user.id).single()
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { data: job } = await supabase.from('analysis_jobs')
    .insert({ company_id: company.id, status: 'pending' }).select().single()

  runPipeline(job!.id, company.id).catch(console.error)
  return NextResponse.json({ jobId: job!.id })
}
