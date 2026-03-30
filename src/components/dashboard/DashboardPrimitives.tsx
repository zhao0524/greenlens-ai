import type { ReactNode } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

function cx(...classes: Array<string | false | null | undefined>) {
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
  return <div className={cx('px-4 py-5 lg:px-6 lg:py-6', className)}>{children}</div>
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#12241d]">{title}</h1>
        <p className="mt-1 text-sm text-[#8b9a93]">{subtitle}</p>
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

type DashboardFilterItem = {
  label: string
  value: string
}

type DashboardFilterBarProps =
  | {
      children: ReactNode
      items?: never
      actionLabel?: never
    }
  | {
      children?: never
      items: DashboardFilterItem[]
      actionLabel?: string
    }

export function DashboardFilterBar(props: DashboardFilterBarProps) {
  if ('items' in props && props.items) {
    const { items, actionLabel = 'Apply Filter' } = props
    return (
      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        {items.map((item) => (
          <DashboardFilterPill
            key={item.label}
            label={item.label}
            value={item.value}
            showChevron
          />
        ))}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl bg-[#3ac56d] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(58,197,109,0.28)] transition hover:bg-[#35b964]"
        >
          {actionLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      {props.children}
    </div>
  )
}

export function DashboardFilterPill({
  label,
  value,
  showChevron = false,
}: {
  label: string
  value: string
  showChevron?: boolean
}) {
  return (
    <div className="flex-1 basis-40 rounded-2xl border border-[#eef1ee] bg-white px-4 py-3 shadow-[0_4px_14px_rgba(16,38,29,0.04)]">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#99a69f]">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium text-[#1b2b23]">{value}</span>
        {showChevron ? <ChevronDown className="h-4 w-4 text-[#8fa098]" /> : null}
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
  const statusClass = statusTone === 'warning'
    ? 'text-[#ffd7a3]'
    : statusTone === 'neutral'
      ? 'text-white/75'
      : 'text-[#bff0c9]'

  return (
    <div className="rounded-[18px] bg-[linear-gradient(135deg,#2d5d4c_0%,#356d59_100%)] p-5 text-white shadow-[0_14px_30px_rgba(37,80,65,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">{label}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-sm text-white/75">{unit}</p>
        </div>
        <div className="rounded-xl bg-white/12 p-2.5 text-white/85">{icon}</div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 text-xs">
        <span className="text-white/70">{helper}</span>
        <span className={cx('flex items-center gap-1 font-semibold', statusClass)}>
          {delta !== null && delta !== undefined ? (
            <>
              {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {delta > 0 ? '+' : ''}
              {formatNumber(delta, Math.abs(delta) < 10 ? 1 : 0)}
              {deltaSuffix}
            </>
          ) : statusLabel ? (
            statusLabel
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Live
            </>
          )}
        </span>
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#152820]">{title}</h2>
          {subtitle && <p className="mt-1 text-xs leading-5 text-[#96a49d]">{subtitle}</p>}
        </div>
        {badge}
      </div>
      <div className={cx('mt-4', fillHeight && 'flex-1 flex flex-col')}>{children}</div>
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

  return (
    <div className="rounded-2xl bg-[#fbfcfb] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.15em] text-[#9aa7a0]">{label}</p>
      <p className={cx('mt-2 text-2xl font-semibold', colorClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs leading-5 text-[#7f8f88]">{hint}</p>}
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
          ? 'bg-[#f7fbf8] text-[#60726b] border-[#dce9e2]'
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

  return (
    <div className="rounded-2xl bg-[#fbfcfb] px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#1a2c24]">{label}</p>
          {hint && <p className="mt-1 text-xs text-[#7f8f88]">{hint}</p>}
        </div>
        <p className="text-sm font-semibold text-[#152820]">{value}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e4ece7]">
        <div
          className={cx('h-full rounded-full', barClass)}
          style={{ width: `${Math.max(4, Math.min(100, percentage))}%` }}
        />
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
        <thead className="bg-[#fbfcfb]">
          <tr className="border-b border-[#edf1ee]">
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#93a19b]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-[#edf1ee] last:border-0">
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
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#7f8f88]">{message}</p>
    </div>
  )
}
