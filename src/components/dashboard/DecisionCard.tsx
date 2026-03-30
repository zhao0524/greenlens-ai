import Link from 'next/link'
import { DashboardBadge } from '@/components/dashboard/DashboardPrimitives'

interface Decision {
  title: string
  situation: string
  impactScore: number
  urgencyTier: string
  carbonImpact?: string
  financialImpact?: string
  effort?: string
}

interface DecisionCardProps {
  decision: Decision
  index: number
  href?: string
}

const urgencyColors: Record<string, string> = {
  high: 'red',
  medium: 'amber',
  low: 'blue',
}

export default function DecisionCard({ decision, index, href }: DecisionCardProps) {
  const tierColor = urgencyColors[decision.urgencyTier?.toLowerCase()] ?? 'slate'

  return (
    <Link href={href ?? `/dashboard/decisions/${index}`}>
      <div className="cursor-pointer rounded-[20px] border border-[#eff2ef] bg-white p-5 shadow-[0_8px_26px_rgba(16,38,29,0.05)] transition hover:border-[#d5e3db] hover:shadow-[0_12px_30px_rgba(16,38,29,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#5a6e66] text-sm font-mono">#{index}</span>
              <h3 className="truncate font-semibold text-[#152820]">{decision.title}</h3>
            </div>
            <p className="line-clamp-2 text-sm leading-6 text-[#2e4a40]">{decision.situation}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              {decision.carbonImpact && (
                <span className="text-xs font-medium text-emerald-700">{decision.carbonImpact}</span>
              )}
              {decision.financialImpact && (
                <span className="text-xs font-medium text-blue-700">{decision.financialImpact}</span>
              )}
              {decision.effort && (
                <span className="text-xs font-medium text-[#4a5e56]">Effort: {decision.effort}</span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-[#152820]">{decision.impactScore}<span className="text-sm text-[#5a6e66]">/10</span></p>
            <div className="mt-1">
              <DashboardBadge tone={tierColor as 'green' | 'amber' | 'blue' | 'red' | 'slate'}>
              {decision.urgencyTier}
              </DashboardBadge>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
