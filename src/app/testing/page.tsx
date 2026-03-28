'use client'

import { useState } from 'react'

export default function TestingPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runTest() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/testing/backboard', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : JSON.stringify(data, null, 2))
        return
      }
      setResult(JSON.stringify(data, null, 2))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Backboard API test</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Temporary page. Calls <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">POST /api/testing/backboard</code>{' '}
        (create assistant → thread → one message). Remove when debugging is done.
      </p>

      <button
        type="button"
        onClick={runTest}
        disabled={loading}
        className="mt-6 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {loading ? 'Running…' : 'Run Backboard smoke test'}
      </button>

      {error && (
        <pre className="mt-6 overflow-auto rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-900 whitespace-pre-wrap">
          {error}
        </pre>
      )}

      {result && (
        <pre className="mt-6 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-800 whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  )
}
