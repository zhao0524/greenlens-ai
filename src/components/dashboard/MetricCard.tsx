interface MetricCardProps {
  label: string
  value: string
  unit?: string
  delta?: number | null
  status?: 'good' | 'warning'
}

export default function MetricCard({ label, value, unit, delta, status }: MetricCardProps) {
  return (
    <div className="rounded-[20px] border border-[#eff2ef] bg-white p-5 shadow-[0_8px_26px_rgba(16,38,29,0.05)]">
      <p className="mb-1 text-sm text-[#4a5e56]">{label}</p>
      <p className="text-2xl font-bold text-[#152820]">{value}</p>
      {unit && <p className="mt-0.5 text-sm text-[#5a6e66]">{unit}</p>}
      <div className="flex items-center gap-2 mt-2">
        {delta !== null && delta !== undefined && (
          <span className={`text-sm font-medium ${delta < 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {delta > 0 ? '+' : ''}{delta}%
          </span>
        )}
        {status && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            status === 'good'
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-amber-50 text-amber-800'
          }`}>
            {status === 'good' ? 'On track' : 'Needs attention'}
          </span>
        )}
      </div>
    </div>
  )
}
