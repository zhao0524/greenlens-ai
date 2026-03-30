import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const intent = searchParams.get('intent') ?? 'login'

  // OAuth provider returned an error (e.g. user denied consent, misconfigured Azure app)
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')
  if (oauthError) {
    const detail = oauthErrorDescription ? encodeURIComponent(oauthErrorDescription) : oauthError
    return NextResponse.redirect(`${origin}/login?error=auth_failed&detail=${detail}`)
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      const detail = encodeURIComponent(error.message)
      return NextResponse.redirect(`${origin}/login?error=auth_failed&detail=${detail}`)
    }

    const user = data.session?.user
    if (!user) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    // Check for existing company record using service role key (bypasses RLS)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: company } = await serviceClient
      .from('companies')
      .select('id')
      .eq('supabase_user_id', user.id)
      .maybeSingle()

    const hasCompany = !!company
    const provider = user.app_metadata?.provider ?? ''
    const providerParam = ['azure', 'google'].includes(provider) ? `?login_via=${provider}` : ''

    if (intent === 'login') {
      if (!hasCompany) {
        // New user — send them through onboarding to create their company and connect integrations
        return NextResponse.redirect(`${origin}/onboarding${providerParam}`)
      }
      return NextResponse.redirect(`${origin}/onboarding/connect?next=/dashboard`)
    }

    // intent === 'signup'
    if (hasCompany) {
      // Already signed up — skip onboarding and go straight to dashboard
      return NextResponse.redirect(`${origin}/dashboard`)
    }
    return NextResponse.redirect(`${origin}/onboarding${providerParam}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
