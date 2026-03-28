import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import axios from 'axios'

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/onboarding/connect?error=microsoft_failed`)
  }

  try {
    const tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common'
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/microsoft/callback`
      })
    )
    const { access_token, refresh_token, expires_in } = tokenResponse.data

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Microsoft callback: no user session', userError?.message)
      return NextResponse.redirect(`${origin}/login?error=session_expired`)
    }

    const { data: company, error: companyError } = await supabase
      .from('companies').select('id')
      .eq('supabase_user_id', user.id).single()

    if (companyError || !company) {
      console.error('Microsoft callback: no company for user', user.id, companyError?.message)
      return NextResponse.redirect(`${origin}/onboarding?error=company_missing`)
    }

    await supabase.from('integrations').upsert({
      company_id: company.id, provider: 'microsoft',
      access_token, refresh_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      is_active: true
    }, { onConflict: 'company_id,provider' })

    return NextResponse.redirect(`${origin}/onboarding/connect?success=microsoft`)
  } catch (err: any) {
    const detail = err.response?.data?.error_description ?? err.response?.data?.error ?? err.message ?? 'unknown'
    console.error('Microsoft callback error:', detail)
    const msg = encodeURIComponent(String(detail).slice(0, 200))
    return NextResponse.redirect(`${origin}/onboarding/connect?error=microsoft_failed&detail=${msg}`)
  }
}
