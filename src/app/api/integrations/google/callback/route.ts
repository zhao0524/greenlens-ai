import { NextResponse } from 'next/server'
import axios from 'axios'
import { createClient } from '@/lib/supabase/server'
import { getGoogleAccessToken } from '@/lib/integrations/google'
import {
  buildIntegrationCallbackRedirect,
  persistOAuthIntegration,
} from '@/lib/integrations/oauth-helpers'

function getOAuthErrorDetail(error: unknown) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as {
      error_description?: string
      error?: string
    } | undefined

    return responseData?.error_description
      ?? responseData?.error
      ?? error.message
      ?? 'unknown'
  }

  return error instanceof Error ? error.message : 'unknown'
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    const desc = searchParams.get('error_description') ?? error ?? 'access_denied'
    console.error('Google OAuth error:', desc)
    return NextResponse.redirect(
      buildIntegrationCallbackRedirect(origin, 'google', 'error', String(desc))
    )
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')}/api/integrations/google/callback`
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

    const persistenceError = await persistOAuthIntegration(supabase, {
      company_id: company.id, provider: 'google',
      access_token, refresh_token,
      token_expires_at: expires_in
        ? new Date(Date.now() + expires_in * 1000).toISOString()
        : null,
      is_active: true
    })

    if (persistenceError) {
      console.error('Google callback: failed to persist integration', persistenceError)
      return NextResponse.redirect(
        buildIntegrationCallbackRedirect(origin, 'google', 'error', persistenceError)
      )
    }

    return NextResponse.redirect(buildIntegrationCallbackRedirect(origin, 'google', 'success'))
  } catch (err: unknown) {
    const detail = getOAuthErrorDetail(err)
    console.error('Google callback error:', detail)
    return NextResponse.redirect(
      buildIntegrationCallbackRedirect(origin, 'google', 'error', String(detail))
    )
  }
}
