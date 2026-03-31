'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cx } from '@/components/dashboard/DashboardPrimitives'

interface ToggleOption {
  label: string
  value: string
}

interface DashboardFilterToggleGroupProps {
  label: string
  paramKey: string
  options: ToggleOption[]
  values: string[]
}

function serializeSelection(values: string[]) {
  return values.join(',')
}

export function DashboardFilterToggleGroup({
  label,
  paramKey,
  options,
  values,
}: DashboardFilterToggleGroupProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleToggle(optionValue: string) {
    const nextValues = values.includes(optionValue)
      ? values.filter((value) => value !== optionValue)
      : [...values, optionValue]

    const normalizedValues = options
      .map((option) => option.value)
      .filter((value) => nextValues.includes(value))
    const params = new URLSearchParams(searchParams.toString())

    if (normalizedValues.length === 0 || normalizedValues.length === options.length) {
      params.delete(paramKey)
    } else {
      params.set(paramKey, serializeSelection(normalizedValues))
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="min-w-[280px] rounded-2xl border border-[#3ac56d]/35 bg-white px-4 py-3 shadow-[0_4px_14px_rgba(16,38,29,0.04)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#5a6e66]">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = values.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggle(option.value)}
              className={cx(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                selected
                  ? 'border-[#38b76a] bg-[#ecf9f0] text-[#166534]'
                  : 'border-[#dbe7df] bg-[#fbfcfb] text-[#5a6e66] hover:border-[#b8cec0] hover:text-[#1b2b23]'
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
