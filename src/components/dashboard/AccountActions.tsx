'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AccountActions() {
  const router = useRouter()
  const [busy, setBusy] = useState<'signout' | 'delete' | null>(null)

  async function signOut() {
    setBusy('signout')
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function deleteAccount() {
    const ok = window.confirm(
      'Delete your GreenLens account permanently?\n\n' +
        'This removes your company, integrations, reports, and login. This cannot be undone.'
    )
    if (!ok) return

    setBusy('delete')
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error ?? 'Could not delete account. Try again or contact support.')
        return
      }
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={signOut}
        disabled={busy !== null}
        className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {busy === 'signout' ? 'Signing out…' : 'Sign out'}
      </button>
      <button
        type="button"
        onClick={deleteAccount}
        disabled={busy !== null}
        className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400/90 hover:text-red-300 hover:bg-red-950/40 transition-colors disabled:opacity-50"
      >
        {busy === 'delete' ? 'Deleting…' : 'Delete account'}
      </button>
    </div>
  )
}
