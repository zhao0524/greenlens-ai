import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')}/api/integrations/google/callback`,
    scope: [
      'https://www.googleapis.com/auth/apps.licensing',
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/admin.reports.audit.readonly',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  return NextResponse.json({ url })
}
