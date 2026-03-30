import { createAdminClient } from '@/lib/supabase/admin'
import { refreshGoogleAccessToken } from '@/lib/integrations/google'
import { refreshMicrosoftAccessToken } from '@/lib/integrations/microsoft'
import type { IntegrationRecord } from '@/lib/integrations/types'

const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000

export class IntegrationAuthError extends Error {
  provider: string

  constructor(provider: string, message: string) {
    super(message)
    this.name = 'IntegrationAuthError'
    this.provider = provider
  }
}

function isTokenFresh(tokenExpiresAt: string | null) {
  if (!tokenExpiresAt) return true

  const expiresAtMs = new Date(tokenExpiresAt).getTime()
  if (!Number.isFinite(expiresAtMs)) return true

  return expiresAtMs - Date.now() > TOKEN_REFRESH_BUFFER_MS
}

function getProviderLabel(provider: string) {
  switch (provider) {
    case 'google':
      return 'Google Workspace'
    case 'microsoft':
      return 'Microsoft 365'
    case 'openai':
      return 'OpenAI'
    default:
      return provider
  }
}

export async function ensureFreshIntegration(integration: IntegrationRecord): Promise<IntegrationRecord> {
  if (!integration.access_token) {
    throw new IntegrationAuthError(
      integration.provider,
      `${getProviderLabel(integration.provider)} is missing an access token. Reconnect this integration and rerun the analysis.`
    )
  }

  if (integration.provider === 'openai' || isTokenFresh(integration.token_expires_at)) {
    return integration
  }

  if (!integration.refresh_token) {
    throw new IntegrationAuthError(
      integration.provider,
      `${getProviderLabel(integration.provider)} has expired and cannot be refreshed automatically. Reconnect this integration and rerun the analysis.`
    )
  }

  try {
    let refreshed:
      | { access_token: string; refresh_token?: string; expires_in?: number }
      | null = null

    if (integration.provider === 'google') {
      refreshed = await refreshGoogleAccessToken(integration.refresh_token)
    } else if (integration.provider === 'microsoft') {
      refreshed = await refreshMicrosoftAccessToken(integration.refresh_token)
    } else {
      return integration
    }

    const nextIntegration: IntegrationRecord = {
      ...integration,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? integration.refresh_token,
      token_expires_at: refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        : integration.token_expires_at,
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('integrations').update({
      access_token: nextIntegration.access_token,
      refresh_token: nextIntegration.refresh_token,
      token_expires_at: nextIntegration.token_expires_at,
      is_active: true,
    }).eq('id', integration.id)

    if (error) {
      throw new Error(error.message)
    }

    return nextIntegration
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown refresh failure'
    throw new IntegrationAuthError(
      integration.provider,
      `${getProviderLabel(integration.provider)} access expired and refresh failed: ${message}`
    )
  }
}
