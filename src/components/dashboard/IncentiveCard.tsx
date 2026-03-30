import { DashboardBadge } from '@/components/dashboard/DashboardPrimitives'

interface IncentiveCardProps {
  title: string
  description: string
  region: string
  estimatedValue?: string
  actionRequired?: string
}

export default function IncentiveCard({
  title,
  description,
  region,
  estimatedValue,
  actionRequired,
}: IncentiveCardProps) {
  return (
    <div className="rounded-[20px] border border-[#eff2ef] bg-white p-5 shadow-[0_8px_26px_rgba(16,38,29,0.05)]">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#152820]">{title}</h3>
          <div className="mt-2">
            <DashboardBadge tone="blue">{region}</DashboardBadge>
          </div>
        </div>
        {estimatedValue && (
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-emerald-700">{estimatedValue}</p>
            <p className="text-xs font-medium text-[#5a6e66]">estimated value</p>
          </div>
        )}
      </div>
      <p className="text-sm leading-6 text-[#2e4a40]">{description}</p>
      {actionRequired && (
        <div className="mt-4 rounded-2xl bg-[#fbfcfb] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#4a6459]">Action required</p>
          <p className="mt-1 text-xs leading-5 text-[#2e4a40]">{actionRequired}</p>
        </div>
      )}
    </div>
  )
}
