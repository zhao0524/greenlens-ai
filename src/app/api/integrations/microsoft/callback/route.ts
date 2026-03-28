import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import axios from 'axios'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.redirect('/onboarding/connect?error=microsoft_failed')

  const tokenResponse = await axios.post(
    `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
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
  const { data: { user } } = await supabase.auth.getUser()
  const { data: company } = await supabase.from('companies').select('id')
    .eq('supabase_user_id', user!.id).single()
  await supabase.from('integrations').upsert({
    company_id: company!.id, provider: 'microsoft',
    access_token, refresh_token,
    token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    is_active: true
  })
  return NextResponse.redirect('/onboarding/connect?success=microsoft')
}
