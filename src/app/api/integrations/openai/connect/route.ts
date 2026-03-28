import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Prevent the route (and the onboarding UI) from hanging if OpenAI never responds. */
const OPENAI_VERIFY_TIMEOUT_MS = 20_000

function isTimeoutOrAbort(e: unknown): boolean {
  const n = e instanceof Error || (typeof DOMException !== 'undefined' && e instanceof DOMException)
    ? (e as Error).name
    : ''
  return n === 'AbortError' || n === 'TimeoutError'
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  // User / project / service account secrets all start with sk- (trimmed above).
  if (!apiKey || !apiKey.startsWith('sk-') || apiKey.length < 20) {
    return NextResponse.json({
      error: 'Paste your full secret key from platform.openai.com/api-keys (long string starting with sk-).'
    }, { status: 400 })
  }
  try {
    // Validate with /v1/models — works for normal API keys.
    const testResponse = await fetch('https://api.openai.com/v1/models?limit=1', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(OPENAI_VERIFY_TIMEOUT_MS)
    })
    if (!testResponse.ok) {
      const errJson = await testResponse.json().catch(() => null) as {
        error?: { message?: string }
      } | null
      const openaiMsg = errJson?.error?.message
      let detail: string
      if (testResponse.status === 401) {
        detail = openaiMsg
          ? `${openaiMsg} Create a new key at https://platform.openai.com/api-keys and paste it exactly (no spaces).`
          : 'OpenAI rejected this key (401). Create a new secret key at https://platform.openai.com/api-keys — copy the full value, no leading/trailing spaces.'
      } else {
        detail = openaiMsg ?? `OpenAI returned ${testResponse.status}. Check billing and API access at platform.openai.com.`
      }
      return NextResponse.json({ error: detail }, { status: 400 })
    }
  } catch (e) {
    if (isTimeoutOrAbort(e)) {
      return NextResponse.json({
        error: 'OpenAI did not respond in time. Check your network and try again, or verify api.openai.com is reachable.'
      }, { status: 400 })
    }
    return NextResponse.json({ error: 'Could not reach OpenAI' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Your session expired. Refresh the page and sign in again.' }, { status: 401 })
  }
  const { data: company, error: companyError } = await supabase.from('companies').select('id')
    .eq('supabase_user_id', user.id).single()
  if (companyError || !company) {
    return NextResponse.json({ error: 'Company record not found. Go back to step 1 or sign in again.' }, { status: 400 })
  }
  const { error: upsertError } = await supabase.from('integrations').upsert({
    company_id: company.id, provider: 'openai', access_token: apiKey,
    metadata: { key_prefix: apiKey.slice(0, 8) + '...' }, is_active: true
  })
  if (upsertError) {
    return NextResponse.json({ error: upsertError.message ?? 'Could not save integration.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
