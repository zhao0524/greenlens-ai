'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolvePersistedOAuthSuccess } from '@/lib/integrations/oauth-helpers'

/** Slightly longer than server OpenAI timeout so the API can return a JSON error first. */
const CONNECT_FETCH_TIMEOUT_MS = 25_000

const INTEGRATIONS = [
  {
    id: 'microsoft', name: 'Microsoft 365',
    description: 'Copilot license utilization and seat data via Microsoft Graph admin API. Aggregate organisational data only.',
    badge: 'Recommended', connectUrl: '/api/integrations/microsoft/connect', type: 'oauth'
  },
  {
    id: 'google', name: 'Google Workspace',
    description: 'Gemini license deployment and 30-day admin activity via Google Workspace APIs. Usage-derived carbon reporting comes later.',
    badge: null, connectUrl: '/api/integrations/google/connect', type: 'oauth'
  },
  {
    id: 'openai', name: 'OpenAI',
    description: 'API model usage, token volumes, and request patterns. Usage API only — no prompt content accessible.',
    badge: 'Recommended', connectUrl: '/api/integrations/openai/connect', type: 'apikey'
  }
]

export default function ConnectPage() {
  return (
    <Suspense fallback={<div className="hero-nature-bg min-h-screen" />}>
      <ConnectPageInner />
    </Suspense>
  )
}

function ConnectPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next') ?? '/onboarding/confirm'
  const [connected, setConnected] = useState<string[]>([])
  const [openaiKey, setOpenaiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // On mount: load existing integrations from DB + handle success/error params from OAuth callback
  useEffect(() => {
    async function loadConnected() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: company } = await supabase.from('companies').select('id')
          .eq('supabase_user_id', user.id).single()
        if (!company) return

        const { data: integrations } = await supabase.from('integrations')
          .select('provider').eq('company_id', company.id).eq('is_active', true)

        const savedProviders = (integrations ?? []).map((integration: { provider: string }) => integration.provider)
        setConnected(savedProviders)

        // All 3 integrations already connected — skip the page and go to destination
        if (savedProviders.length === INTEGRATIONS.length) {
          router.replace(nextParam)
          return
        }

        // If the user signed in via Azure or Google, auto-initiate the matching admin OAuth flow
        // (only on first visit — skip if they've already connected that provider)
        const loginVia = searchParams.get('login_via') ?? (user.app_metadata?.provider as string | undefined) ?? ''
        if (loginVia === 'azure' && !savedProviders.includes('microsoft')) {
          window.location.href = '/api/integrations/microsoft/connect'
          return
        }
        if (loginVia === 'google' && !savedProviders.includes('google')) {
          window.location.href = '/api/integrations/google/connect'
          return
        }

        const successParam = resolvePersistedOAuthSuccess(savedProviders, searchParams.get('success'))
        if (successParam) {
          const providerLabel = INTEGRATIONS.find((integration) => integration.id === successParam)?.name ?? successParam
          setSuccess(`${providerLabel} connected successfully.`)
        } else {
          setSuccess(null)
        }
      } catch (e) {
        console.error('Failed to load integrations:', e)
      } finally {
        setLoading(false)
      }
    }

    const errorParam = searchParams.get('error')
    const detailParam = searchParams.get('detail')
    if (errorParam) {
      const base: Record<string, string> = {
        microsoft_failed: 'Microsoft connection failed.',
        google_failed: 'Google connection failed.'
      }
      const hint: Record<string, string> = {
        microsoft_failed: 'Make sure the redirect URI http://localhost:3000/api/integrations/microsoft/callback is registered in your Azure App Registration, and that you are signing in as a Global Admin.',
        google_failed: 'Google Workspace integration requires a Google Workspace domain admin account — personal @gmail.com accounts cannot grant these scopes.'
      }
      const detail = detailParam ? ` Error: ${decodeURIComponent(detailParam)}` : ''
      setError(`${base[errorParam] ?? 'Connection failed.'} ${hint[errorParam] ?? ''}${detail}`)
      setSuccess(null)
    }

    loadConnected()
  }, [searchParams])

  const handleOpenAISave = async () => {
    setSaving(true)
    setError(null)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONNECT_FETCH_TIMEOUT_MS)
    try {
      const res = await fetch('/api/integrations/openai/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: openaiKey.trim() }),
        signal: controller.signal
      })
      if (res.ok) {
        setConnected(prev => prev.includes('openai') ? prev : [...prev, 'openai'])
        setOpenaiKey('')
        setSuccess('OpenAI connected successfully.')
      } else {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'API key invalid or could not be verified.')
      }
    } catch (e) {
      const name = e instanceof Error ? e.name : ''
      if (name === 'AbortError' || name === 'TimeoutError') {
        setError('Request timed out. Check your connection and try again.')
      } else {
        setError('Could not reach the app server. Check your internet connection.')
      }
    } finally {
      clearTimeout(timeoutId)
      setSaving(false)
    }
  }

  return (
    <div className="hero-nature-bg min-h-screen flex flex-col">
      {/* Glass header */}
      <div className="glass-header px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(76,112,96,0.9)' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-white font-medium text-sm tracking-tight">GreenLens AI</span>
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Step 2 of 3</span>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className="max-w-lg w-full rounded-2xl p-8 fade-in-up"
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-medium text-white tracking-tight">Connect your AI stack</h1>
            <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Connect all three integrations to continue.
            </p>
          </div>

          {/* Privacy info banner */}
          <div
            className="rounded-xl p-4 mb-6"
            style={{ background: 'rgba(76,112,96,0.15)', border: '1px solid rgba(76,112,96,0.3)' }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
              What we collect and how
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              GreenLens measures the ecological impact of your organisation&apos;s AI deployment, not the
              activity of individuals. We connect to admin dashboards and usage APIs that expose
              aggregate organisational data: which models are deployed, total token volumes, and
              license seat utilization. Individual prompts, messages, and user conversations are
              never accessible through these API endpoints.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl px-4 py-3"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl px-4 py-3"
              style={{ background: 'rgba(76,112,96,0.2)', border: '1px solid rgba(76,112,96,0.4)' }}>
              <p className="text-sm" style={{ color: 'rgba(134,198,167,1)' }}>{success}</p>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {INTEGRATIONS.map(integration => (
              <div
                key={integration.id}
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-medium text-sm">{integration.name}</p>
                      {integration.badge && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(76,112,96,0.35)', color: 'rgba(134,198,167,1)' }}
                        >
                          {integration.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {integration.description}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {connected.includes(integration.id) ? (
                      <span className="flex items-center gap-1 text-sm font-medium"
                        style={{ color: 'rgba(134,198,167,1)' }}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Connected
                      </span>
                    ) : integration.type === 'apikey' ? (
                      <div className="flex flex-col gap-2 items-end">
                        <input
                          type="password"
                          placeholder="sk-..."
                          value={openaiKey}
                          onChange={e => setOpenaiKey(e.target.value)}
                          className="px-3 py-1.5 text-white text-sm w-44 rounded-lg focus:outline-none placeholder-white/30"
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.2)',
                          }}
                        />
                        <button
                          onClick={handleOpenAISave}
                          disabled={!openaiKey || saving}
                          className="text-sm disabled:opacity-50"
                          style={{ color: 'rgba(134,198,167,1)' }}
                        >
                          {saving ? 'Verifying…' : 'Save key'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { window.location.href = integration.connectUrl }}
                        className="btn-secondary-dark text-sm px-4 py-2 rounded-lg"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push(nextParam)}
            disabled={connected.length < INTEGRATIONS.length || loading}
            className="btn-primary w-full py-3 rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading…' : `Continue${connected.length > 0 ? ` (${connected.length} / ${INTEGRATIONS.length} connected)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
