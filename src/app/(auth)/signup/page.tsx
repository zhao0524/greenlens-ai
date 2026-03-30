'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function SignupPageInner() {
  const [loading, setLoading] = useState<string | null>(null)
  const [emailMode, setEmailMode] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleOAuth = async (provider: 'azure' | 'google' | 'github') => {
    setLoading(provider)
    setError(null)
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?intent=signup`,
        // Azure requires explicit email scope to return the user's email address
        scopes: provider === 'azure' ? 'email profile openid' : undefined,
      },
    })
  }

  const handleEmailSignup = async () => {
    if (!email.trim()) return
    setLoading('email')
    setError(null)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?intent=signup` },
    })
    setLoading(null)
    if (otpError) {
      setError(otpError.message)
    } else {
      setEmailSent(true)
    }
  }

  return (
    <div className="hero-nature-bg min-h-screen flex flex-col">
      {/* Mini nav */}
      <div className="glass-header px-8 py-4 flex items-center justify-start">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(76,112,96,0.9)' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-white font-medium text-sm tracking-tight">GreenLens AI</span>
        </Link>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div
          className="max-w-sm w-full rounded-2xl p-8 fade-in-up"
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(76,112,96,0.85)' }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-medium text-white tracking-tight">Create your account</h1>
            <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Get started — measure your organisation&apos;s AI carbon footprint
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Email sent confirmation */}
          {emailSent ? (
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(76,112,96,0.3)', border: '1px solid rgba(76,112,96,0.5)' }}
              >
                <svg className="w-6 h-6" style={{ color: '#4C7060' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white font-medium mb-1">Check your inbox</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                We sent a sign-up link to <span className="text-white">{email}</span>
              </p>
              <button
                onClick={() => { setEmailSent(false); setEmailMode(false); setEmail('') }}
                className="mt-4 text-sm underline underline-offset-2"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                Use a different method
              </button>
            </div>
          ) : emailMode ? (
            /* Email input form */
            <div className="space-y-3">
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEmailSignup()}
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
              <button
                onClick={handleEmailSignup}
                disabled={!email.trim() || loading === 'email'}
                className="btn-primary w-full py-3 px-4 rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'email' ? 'Sending…' : 'Send sign-up link'}
              </button>
              <button
                onClick={() => { setEmailMode(false); setError(null) }}
                className="w-full text-sm py-2"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                ← Back to all options
              </button>
            </div>
          ) : (
            /* Provider buttons */
            <div className="space-y-3">
              {/* Microsoft — primary CTA */}
              <button
                onClick={() => handleOAuth('azure')}
                disabled={!!loading}
                className="btn-primary w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
                {loading === 'azure' ? 'Redirecting…' : 'Continue with Microsoft'}
              </button>

              {/* Google */}
              <button
                onClick={() => handleOAuth('google')}
                disabled={!!loading}
                className="btn-secondary-dark w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading === 'google' ? 'Redirecting…' : 'Continue with Google'}
              </button>

              {/* GitHub + Email — compact secondary row */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleOAuth('github')}
                  disabled={!!loading}
                  className="btn-secondary-dark flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  {loading === 'github' ? '…' : 'GitHub'}
                </button>
                <button
                  onClick={() => setEmailMode(true)}
                  disabled={!!loading}
                  className="btn-secondary-dark flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </button>
              </div>
            </div>
          )}

          {/* Disclaimer + login link */}
          {!emailSent && (
            <div className="mt-6 text-center space-y-2">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                By creating an account you agree to our terms of service.
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Already have an account?{' '}
                <a href="/login" className="underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Log in
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  )
}
