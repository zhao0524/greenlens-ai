import { NextResponse } from 'next/server'
import { buildMicrosoftAuthorizeUrl } from '@/lib/integrations/oauth-helpers'

export async function GET() {
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common'
  const url = buildMicrosoftAuthorizeUrl({
    tenantId,
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL!,
  })
  return NextResponse.json({ url })
}
