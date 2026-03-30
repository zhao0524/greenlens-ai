import { NextResponse } from 'next/server'
import { buildMicrosoftAuthorizeUrl } from '@/lib/integrations/oauth-helpers'

export async function GET() {
  // Use the specific tenant ID (not /common/) so admin consent flows correctly.
  // Reports.Read.All and Directory.Read.All require admin consent — prompt=admin_consent
  // forces the admin consent screen so a tenant Global Admin can approve.
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common'
  return NextResponse.redirect(buildMicrosoftAuthorizeUrl({
    tenantId,
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL!,
  }))
}
