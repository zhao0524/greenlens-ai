import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildIntegrationCallbackRedirect,
  buildMicrosoftAuthorizeUrl,
  persistOAuthIntegration,
  resolvePersistedOAuthSuccess,
} from '../src/lib/integrations/oauth-helpers'

test('buildMicrosoftAuthorizeUrl forces admin consent in the authorization URL', () => {
  const url = new URL(buildMicrosoftAuthorizeUrl({
    tenantId: 'tenant-123',
    clientId: 'client-123',
    siteUrl: 'http://localhost:3000',
  }))

  assert.equal(url.searchParams.get('prompt'), 'admin_consent')
  assert.equal(url.searchParams.get('client_id'), 'client-123')
})

test('resolvePersistedOAuthSuccess only returns success when the provider is actually saved', () => {
  assert.equal(resolvePersistedOAuthSuccess(['google'], 'google'), 'google')
  assert.equal(resolvePersistedOAuthSuccess([], 'google'), null)
  assert.equal(resolvePersistedOAuthSuccess(['microsoft'], 'google'), null)
})

test('persistOAuthIntegration surfaces database errors instead of pretending success', async () => {
  const errorMessage = await persistOAuthIntegration(
    {
      from(tableName: 'integrations') {
        assert.equal(tableName, 'integrations')
        return {
          async upsert() {
            return {
              error: {
                message: 'write failed',
              },
            }
          },
        }
      },
    },
    {
      company_id: 'company-1',
      provider: 'google',
      access_token: 'token',
      is_active: true,
    }
  )

  assert.equal(errorMessage, 'write failed')
})

test('buildIntegrationCallbackRedirect keeps success and failure redirect shapes stable', () => {
  assert.equal(
    buildIntegrationCallbackRedirect('http://localhost:3000', 'google', 'success'),
    'http://localhost:3000/onboarding/connect?success=google'
  )
  assert.match(
    buildIntegrationCallbackRedirect('http://localhost:3000', 'microsoft', 'error', 'write failed'),
    /http:\/\/localhost:3000\/onboarding\/connect\?error=microsoft_failed&detail=write%20failed/
  )
})
