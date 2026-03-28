import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleAccessToken } from '@/lib/integrations/google'

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    const desc = searchParams.get('error_description') ?? error ?? 'access_denied'
    console.error('Google OAuth error:', desc)
    const msg = encodeURIComponent(String(desc).slice(0, 200))
    return NextResponse.redirect(`${origin}/onboarding/connect?error=google_failed&detail=${msg}`)
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/google/callback`
    const tokenData = await getGoogleAccessToken(code, redirectUri)
    const { access_token, refresh_token, expires_in } = tokenData

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Google callback: no user session', userError?.message)
      return NextResponse.redirect(`${origin}/login?error=session_expired`)
    }

    const { data: company, error: companyError } = await supabase
      .from('companies').select('id')
      .eq('supabase_user_id', user.id).single()

    if (companyError || !company) {
      console.error('Google callback: no company for user', user.id, companyError?.message)
      return NextResponse.redirect(`${origin}/onboarding?error=company_missing`)
    }

    await supabase.from('integrations').upsert({
      company_id: company.id, provider: 'google',
      access_token, refresh_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      is_active: true
    }, { onConflict: 'company_id,provider' })

    return NextResponse.redirect(`${origin}/onboarding/connect?success=google`)
  } catch (err: any) {
    const detail = err.response?.data?.error_description ?? err.response?.data?.error ?? err.message ?? 'unknown'
    console.error('Google callback error:', detail)
    const msg = encodeURIComponent(String(detail).slice(0, 200))
    return NextResponse.redirect(`${origin}/onboarding/connect?error=google_failed&detail=${msg}`)
  }
}
