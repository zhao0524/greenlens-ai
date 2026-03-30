'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AccountActionsProps {
  variant?: 'default' | 'sidebar'
}

export default function AccountActions({ variant = 'default' }: AccountActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = useState<'signout' | 'delete' | null>(null)
  const isSidebar = variant === 'sidebar'

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
    <div className={isSidebar ? 'space-y-2' : 'flex flex-wrap items-center gap-2'}>
      <button
        type="button"
        onClick={signOut}
        disabled={busy !== null}
        className={
          isSidebar
            ? 'block w-full rounded-xl border border-white/10 bg-white/6 px-2 py-2 text-center text-[10px] font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50'
            : 'rounded-2xl border border-[#dce9e2] bg-[#f6faf8] px-4 py-2 text-sm font-medium text-[#1d3b2e] transition hover:border-[#b7d2c3] hover:bg-[#edf6f1] disabled:opacity-50'
        }
      >
        {busy === 'signout' ? 'Signing out…' : 'Sign out'}
      </button>
      <button
        type="button"
        onClick={deleteAccount}
        disabled={busy !== null}
        className={
          isSidebar
            ? 'block w-full rounded-xl border border-red-300/40 bg-red-500/12 px-2 py-2 text-center text-[10px] font-medium text-red-100 transition hover:bg-red-500/18 disabled:opacity-50'
            : 'rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50'
        }
      >
        {busy === 'delete' ? 'Deleting…' : 'Delete account'}
      </button>
    </div>
  )
}
