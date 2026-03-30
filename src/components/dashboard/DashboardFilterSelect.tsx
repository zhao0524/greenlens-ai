'use client'

import { ChevronDown } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function DashboardFilterSelect({
  label,
  paramKey,
  value,
  options,
}: {
  label: string
  paramKey: string
  value: string
  options: { label: string; value: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(newValue: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (newValue === 'all') {
      params.delete(paramKey)
    } else {
      params.set(paramKey, newValue)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="flex-1 basis-40 rounded-2xl border border-[#3ac56d]/35 bg-white px-4 py-3 shadow-[0_4px_14px_rgba(16,38,29,0.04)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#5a6e66]">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full appearance-none bg-transparent text-sm font-medium text-[#1b2b23] outline-none cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#3ac56d] pointer-events-none" />
      </div>
    </div>
  )
}
