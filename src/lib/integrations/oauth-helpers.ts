type OAuthProvider = 'google' | 'microsoft'

interface PersistIntegrationClient {
  from(tableName: 'integrations'): {
    upsert(
      payload: Record<string, unknown>,
      options: { onConflict: string }
    ): PromiseLike<{ error: { message?: string } | null }>
  }
}

export function buildIntegrationCallbackRedirect(
  origin: string,
  provider: OAuthProvider,
  outcome: 'success' | 'error',
  detail?: string
) {
  if (outcome === 'success') {
    return `${origin}/onboarding/connect?success=${provider}`
  }

  const detailParam = detail
    ? `&detail=${encodeURIComponent(detail.slice(0, 200))}`
    : ''

  return `${origin}/onboarding/connect?error=${provider}_failed${detailParam}`
}

export function buildMicrosoftAuthorizeUrl({
  tenantId,
  clientId,
  siteUrl,
}: {
  tenantId: string
  clientId: string
  siteUrl: string
}) {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: `${siteUrl}/api/integrations/microsoft/callback`,
    scope: [
      'https://graph.microsoft.com/Reports.Read.All',
      'https://graph.microsoft.com/Directory.Read.All',
      'offline_access',
    ].join(' '),
    response_mode: 'query',
    prompt: 'admin_consent',
  })

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`
}

export function resolvePersistedOAuthSuccess(
  savedProviders: string[],
  successParam: string | null
) {
  if (!successParam || !savedProviders.includes(successParam)) {
    return null
  }

  return successParam
}

export async function persistOAuthIntegration(
  supabase: PersistIntegrationClient,
  payload: Record<string, unknown>
) {
  const { error } = await supabase
    .from('integrations')
    .upsert(payload, { onConflict: 'company_id,provider' })

  return error?.message ?? null
}
