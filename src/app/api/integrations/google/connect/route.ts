import { NextResponse } from 'next/server'

export async function GET() {
  // Google Workspace Admin Reports API scope.
  // Requires a Google Workspace domain administrator account (not personal Gmail).
  // admin.reports.usage.readonly gives aggregate app usage stats including Gemini usage.
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/google/callback`,
    scope: [
      'https://www.googleapis.com/auth/admin.reports.usage.readonly',
      'https://www.googleapis.com/auth/admin.directory.user.readonly'
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent'
  })
  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}
