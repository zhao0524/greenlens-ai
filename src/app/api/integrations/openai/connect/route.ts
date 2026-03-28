import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { apiKey } = await request.json()
  if (!apiKey || !apiKey.startsWith('sk-')) {
    return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 })
  }
  try {
    const testResponse = await fetch(
      'https://api.openai.com/v1/usage?date=' + new Date().toISOString().split('T')[0],
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    if (!testResponse.ok) return NextResponse.json({ error: 'API key validation failed' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Could not reach OpenAI' }, { status: 400 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id')
    .eq('supabase_user_id', user!.id).single()
  await supabase.from('integrations').upsert({
    company_id: company!.id, provider: 'openai', access_token: apiKey,
    metadata: { key_prefix: apiKey.slice(0, 8) + '...' }, is_active: true
  })
  return NextResponse.json({ success: true })
}
