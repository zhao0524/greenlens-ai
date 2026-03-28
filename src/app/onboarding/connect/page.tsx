'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INTEGRATIONS = [
  {
    id: 'microsoft', name: 'Microsoft 365',
    description: 'Copilot license utilization and seat data via Microsoft Graph admin API. Aggregate organisational data only.',
    badge: 'Recommended', connectUrl: '/api/integrations/microsoft/connect', type: 'oauth'
  },
  {
    id: 'google', name: 'Google Workspace',
    description: 'Gemini for Workspace license utilization via Google Admin SDK. Read-only.',
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
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-400">Loading…</p></div>}>
      <ConnectPageInner />
    </Suspense>
  )
}

function ConnectPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState<string[]>([])
  const [openaiKey, setOpenaiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

        const savedProviders = (integrations ?? []).map((i: any) => i.provider)

        // Also include ?success=provider returned by the OAuth callback
        const successParam = searchParams.get('success')
        if (successParam && !savedProviders.includes(successParam)) {
          savedProviders.push(successParam)
        }

        setConnected(savedProviders)
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
    }

    loadConnected()
  }, [searchParams])

  const handleOpenAISave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/integrations/openai/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: openaiKey.trim() })
      })
      if (res.ok) {
        setConnected(prev => prev.includes('openai') ? prev : [...prev, 'openai'])
        setOpenaiKey('')
      } else {
        const data = await res.json()
        setError(data.error ?? 'API key invalid or could not be verified.')
      }
    } catch {
      setError('Could not reach OpenAI. Check your internet connection.')
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Connect your AI stack</h1>
        <p className="text-gray-400 mb-2">Step 2 of 3</p>

        <div className="bg-blue-950 border border-blue-800 rounded-xl p-4 mb-6">
          <p className="text-blue-300 text-sm font-medium mb-1">What we collect and how</p>
          <p className="text-blue-400 text-sm">
            GreenLens measures the ecological impact of your organisation&apos;s AI deployment, not the
            activity of individuals. We connect to admin dashboards and usage APIs that expose
            aggregate organisational data: which models are deployed, total token volumes, and
            license seat utilization. Individual prompts, messages, and user conversations are
            never accessible through these API endpoints.
          </p>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-3 mb-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {INTEGRATIONS.map(integration => (
            <div key={integration.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-medium">{integration.name}</p>
                    {integration.badge && (
                      <span className="bg-green-900 text-green-300 text-xs px-2 py-0.5 rounded-full">
                        {integration.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{integration.description}</p>
                </div>
                <div className="shrink-0">
                  {connected.includes(integration.id) ? (
                    <span className="flex items-center gap-1 text-green-400 text-sm font-medium">
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
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm w-44 focus:outline-none focus:border-gray-500"
                      />
                      <button
                        onClick={handleOpenAISave}
                        disabled={!openaiKey || saving}
                        className="text-green-400 text-sm disabled:opacity-50"
                      >
                        {saving ? 'Verifying…' : 'Save key'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { window.location.href = integration.connectUrl }}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
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
          onClick={() => router.push('/onboarding/confirm')}
          disabled={connected.length === 0 || loading}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Loading…' : `Continue${connected.length > 0 ? ` (${connected.length} connected)` : ''}`}
        </button>
        <p className="text-gray-600 text-xs text-center mt-3">
          Connect at least one integration to generate your first report.
        </p>
      </div>
    </div>
  )
}
