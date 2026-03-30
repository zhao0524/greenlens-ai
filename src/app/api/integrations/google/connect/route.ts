import { NextResponse } from 'next/server'

export async function GET() {
  // Stage 1 Google support focuses on Gemini license deployment and trailing
  // activity, not full normalized usage analysis.
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/google/callback`,
    scope: [
      'https://www.googleapis.com/auth/apps.licensing',
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/admin.reports.audit.readonly',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })
  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}
