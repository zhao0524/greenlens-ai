import { NextResponse } from 'next/server'

export async function GET() {
  // Use the specific tenant ID (not /common/) so admin consent flows correctly.
  // Reports.Read.All and Directory.Read.All require admin consent — prompt=admin_consent
  // forces the admin consent screen so a tenant Global Admin can approve.
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common'
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/microsoft/callback`,
    scope: [
      'https://graph.microsoft.com/Reports.Read.All',
      'https://graph.microsoft.com/Directory.Read.All',
      'offline_access'
    ].join(' '),
    response_mode: 'query'
  })
  return NextResponse.redirect(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`
  )
}
