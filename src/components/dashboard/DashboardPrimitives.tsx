import type { ReactNode } from 'react'
import { AnimatedBar } from '@/components/dashboard/AnimatedBar'
import {
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatCompactNumber(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatPercent(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${formatNumber(value, digits)}%`
}

export function formatCurrency(value: number | null | undefined, compact = false) {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value)
}

export function titleize(value: string | null | undefined) {
  if (!value) return 'Unavailable'
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

export function parseCurrencyString(value: string | null | undefined) {
  if (!value) return null
  const cleaned = value.replace(/[^0-9.-]/g, '')
  if (!cleaned) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

export function DashboardPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cx('px-6 py-6 lg:px-8 lg:py-7', className)}>{children}</div>
}

export function DashboardHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string
  subtitle: string
  actions?: ReactNode
  badge?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-1.5 h-6 w-[3px] shrink-0 rounded-full bg-[#38b76a]" />
        <div>
          <h1 className="text-[1.6rem] font-bold tracking-tight text-[#12241d]">{title}</h1>
          <p className="mt-1 text-sm font-medium text-[#546760]">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {badge}
        {actions}
      </div>
    </div>
  )
}

export function DashboardMetaPill({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-full border border-[#dceddf] bg-[#f7fbf8] px-3 py-1.5 text-[11px] font-medium text-[#4d8369]">
      {children}
    </div>
  )
}

export function DashboardFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-3">
      {children}
    </div>
  )
}

export function DashboardFilterPill({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex-1 basis-40 rounded-xl border border-[#eef2ef] border-l-2 border-l-[#3ac56d]/40 bg-white px-4 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#5a6e66]">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#38b76a]/60" />
        <span className="truncate text-sm font-medium text-[#1b2b23]">{value}</span>
      </div>
    </div>
  )
}

export function DashboardStatGrid({
  children,
  columns = 4,
}: {
  children: ReactNode
  columns?: 2 | 3 | 4
}) {
  const columnClass = columns === 2
    ? 'md:grid-cols-2'
    : columns === 3
      ? 'md:grid-cols-2 xl:grid-cols-3'
      : 'md:grid-cols-2 xl:grid-cols-4'

  return <div className={cx('grid gap-4', columnClass)}>{children}</div>
}

export function DashboardStatCard({
  label,
  value,
  unit,
  helper,
  icon,
  delta,
  deltaSuffix = '%',
  statusLabel,
  statusTone = 'good',
}: {
  label: string
  value: string
  unit: string
  helper: string
  icon: ReactNode
  delta?: number | null
  deltaSuffix?: string
  statusLabel?: string
  statusTone?: 'good' | 'warning' | 'neutral'
}) {
  const deltaIsGood = delta !== null && delta !== undefined
    ? (statusTone === 'warning' ? delta < 0 : delta > 0)
    : null

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-[#eef2ef] bg-white p-5 shadow-[0_4px_16px_rgba(16,38,29,0.06)] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(16,38,29,0.10)]">
      <div className="absolute left-0 top-0 h-[3px] w-12 rounded-br-full bg-[#38b76a] opacity-70" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5c6e67]">{label}</p>
          <p className="mt-3 text-[2rem] font-bold tracking-tight text-[#152820]">{value}</p>
          <p className="mt-0.5 text-xs text-[#5c6e67]">{unit}</p>
        </div>
        <div className="rounded-2xl bg-[#f0faf4] p-3 text-[#38b76a] ring-1 ring-[#38b76a]/10">{icon}</div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs text-[#5c6e67]">{helper}</span>
        {delta !== null && delta !== undefined ? (
          <span className={cx(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums',
            deltaIsGood ? 'bg-[#eaf7ee] text-[#1e7d45]' : 'bg-red-50 text-red-600'
          )}>
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta > 0 ? '+' : ''}
            {formatNumber(delta, Math.abs(delta) < 10 ? 1 : 0)}
            {deltaSuffix}
          </span>
        ) : statusLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf7ee] px-2.5 py-1 text-[11px] font-semibold text-[#1e7d45]">
            {statusLabel}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf7ee] px-2.5 py-1 text-[11px] font-semibold text-[#1e7d45]">
            <CheckCircle2 className="h-3 w-3" />
            Live
          </span>
        )}
      </div>
    </div>
  )
}

export function DashboardPanel({
  title,
  subtitle,
  children,
  badge,
  className,
  fillHeight = false,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  badge?: ReactNode
  className?: string
  fillHeight?: boolean
}) {
  return (
    <section className={cx('rounded-[20px] border border-[#eff2ef] bg-white p-5 shadow-[0_8px_26px_rgba(16,38,29,0.05)]', fillHeight && 'flex flex-col', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-[#f0f3f0] pb-4">
        <div>
          <h2 className="text-base font-semibold text-[#152820]">{title}</h2>
          {subtitle && <p className="mt-1 text-xs leading-5 text-[#5a6d65]">{subtitle}</p>}
        </div>
        {badge}
      </div>
      <div className={cx('mt-5', fillHeight && 'flex-1 flex flex-col')}>{children}</div>
    </section>
  )
}

export function DashboardMiniStat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'good' | 'warning'
}) {
  const colorClass = tone === 'good'
    ? 'text-emerald-700'
    : tone === 'warning'
      ? 'text-amber-700'
      : 'text-[#152820]'

  const borderClass = tone === 'good'
    ? 'border-l-2 border-emerald-400'
    : tone === 'warning'
      ? 'border-l-2 border-amber-400'
      : 'border-l-2 border-[#dce9e2]'

  return (
    <div className={cx('rounded-2xl border border-[#eef2ef] bg-[#fafcfb] pl-3 pr-4 py-3', borderClass)}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#5a6e66]">{label}</p>
      <p className={cx('mt-2 text-[1.55rem] font-semibold', colorClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs font-medium leading-5 text-[#4a5e56]">{hint}</p>}
    </div>
  )
}

export function DashboardBadge({
  children,
  tone = 'green',
}: {
  children: ReactNode
  tone?: 'green' | 'amber' | 'blue' | 'red' | 'slate'
}) {
  const toneClass = tone === 'amber'
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : tone === 'blue'
      ? 'bg-blue-50 text-blue-800 border-blue-200'
      : tone === 'red'
        ? 'bg-red-50 text-red-700 border-red-200'
        : tone === 'slate'
          ? 'bg-slate-50 text-slate-600 border-slate-200'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200'

  return (
    <span className={cx('inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold', toneClass)}>
      {children}
    </span>
  )
}

export function DashboardBarRow({
  label,
  value,
  percentage,
  tone = 'green',
  hint,
}: {
  label: string
  value: string
  percentage: number
  tone?: 'green' | 'amber' | 'slate'
  hint?: string
}) {
  const barClass = tone === 'amber'
    ? 'bg-[#e3a063]'
    : tone === 'slate'
      ? 'bg-[#8fa098]'
      : 'bg-[#38b76a]'

  const dotClass = tone === 'amber'
    ? 'bg-[#e3a063]'
    : tone === 'slate'
      ? 'bg-[#8fa098]'
      : 'bg-[#38b76a]'

  return (
    <div className="rounded-2xl bg-[#fbfcfb] px-4 py-3 transition-colors duration-150 hover:bg-[#f5f8f5]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={cx('mt-0.5 h-2 w-2 shrink-0 rounded-full', dotClass)} />
            <p className="text-sm font-medium text-[#1a2c24]">{label}</p>
          </div>
          {hint && <p className="mt-1 text-xs text-[#4a5e56]">{hint}</p>}
        </div>
        <p className="text-sm font-semibold text-[#152820]">{value}</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e4ece7]">
        <AnimatedBar percentage={percentage} className={cx('h-full rounded-full', barClass)} />
      </div>
    </div>
  )
}

export function DashboardTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: ReactNode[][]
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[#edf1ee]">
      <table className="w-full text-sm">
        <thead className="bg-[#f4f7f5]">
          <tr className="border-b border-[#edf1ee]">
            {headers.map((header) => (
              <th key={header} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#5a6d65]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-[#edf1ee] last:border-0 transition-colors duration-100 hover:bg-[#f9fbf9]">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-[#1a2c24]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DashboardEmptyState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#dce9e2] bg-[#fbfcfb] p-8 text-center">
      <p className="font-medium text-[#152820]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#4a5e56]">{message}</p>
    </div>
  )
}
