import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleAccessToken } from '@/lib/integrations/google'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.redirect('/onboarding/connect?error=google_failed')

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/google/callback`
  const tokenData = await getGoogleAccessToken(code, redirectUri)
  const { access_token, refresh_token, expires_in } = tokenData

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id')
    .eq('supabase_user_id', user!.id).single()
  await supabase.from('integrations').upsert({
    company_id: company!.id, provider: 'google',
    access_token, refresh_token,
    token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    is_active: true
  })
  return NextResponse.redirect('/onboarding/connect?success=google')
}
