'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({
    name: '', industry: '', headcount_range: '',
    esg_reporting: [] as string[],
    international_offices: [] as string[]
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setSaveError('Session expired. Please log in again.')
        router.push('/login')
        return
      }

      // Upsert so refreshing the page doesn't create a duplicate company
      const { error: insertError } = await supabase.from('companies').upsert({
        name: form.name, industry: form.industry,
        headcount_range: form.headcount_range,
        esg_reporting_obligations: form.esg_reporting,
        international_offices: form.international_offices,
        supabase_user_id: user.id, onboarding_complete: false
      }, { onConflict: 'supabase_user_id' })

      if (insertError) {
        setSaveError(`Could not save company: ${insertError.message}`)
        return
      }

      router.push('/onboarding/connect')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="px-8 py-4 flex items-center justify-start border-b border-white/10">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="relative w-7 h-7 rounded-full bg-[#7bdc93] overflow-hidden shrink-0">
            <Image src="/greenlens-logo.png" alt="GreenLens AI" fill className="object-cover scale-[1]" />
          </div>
          <span className="text-white font-medium text-sm tracking-tight">GreenLens AI</span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Tell us about your company</h1>
        <p className="text-gray-400 mb-8">Step 1 of 3 — takes about 2 minutes</p>
        <div className="space-y-4">
          <input placeholder="Company name" value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500" />

          <select value={form.industry} onChange={e => setForm({...form, industry: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gray-500">
            <option value="">Select industry</option>
            <option value="financial_services">Financial Services</option>
            <option value="consulting">Consulting</option>
            <option value="insurance">Insurance</option>
            <option value="technology">Technology</option>
            <option value="healthcare">Healthcare</option>
          </select>

          <select value={form.headcount_range} onChange={e => setForm({...form, headcount_range: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gray-500">
            <option value="">Company size</option>
            <option value="100-500">100–500 employees</option>
            <option value="500-2000">500–2,000 employees</option>
            <option value="2000-10000">2,000–10,000 employees</option>
            <option value="10000+">10,000+ employees</option>
          </select>

          <div>
            <p className="text-gray-400 text-sm mb-2">ESG reporting obligations</p>
            {['CSRD', 'GRI', 'IFRS S2', 'CDP', 'UK SDR', 'None currently'].map(o => (
              <label key={o} className="flex items-center gap-2 mb-2 cursor-pointer">
                <input type="checkbox" checked={form.esg_reporting.includes(o)}
                  onChange={e => setForm({...form, esg_reporting: e.target.checked
                    ? [...form.esg_reporting, o] : form.esg_reporting.filter(x => x !== o)})}
                  className="rounded" />
                <span className="text-white">{o}</span>
              </label>
            ))}
          </div>

          <div>
            <p className="text-gray-400 text-sm mb-2">Regions with significant operations</p>
            <p className="text-gray-500 text-xs mb-2">Used to surface relevant regulatory incentives</p>
            {['EU', 'UK', 'Canada', 'Singapore', 'Japan', 'Australia'].map(r => (
              <label key={r} className="flex items-center gap-2 mb-2 cursor-pointer">
                <input type="checkbox" checked={form.international_offices.includes(r)}
                  onChange={e => setForm({...form, international_offices: e.target.checked
                    ? [...form.international_offices, r] : form.international_offices.filter(x => x !== r)})}
                  className="rounded" />
                <span className="text-white">{r}</span>
              </label>
            ))}
          </div>

          {saveError && (
            <div className="bg-red-950 border border-red-800 rounded-xl p-3">
              <p className="text-red-300 text-sm">{saveError}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={!form.name || !form.industry || saving}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
