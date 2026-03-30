interface MitigationCardProps {
  strategy: string
  description: string
  expectedScoreImprovement: string
  effort: string
  timeframe: string
}

export default function MitigationCard({
  strategy,
  description,
  expectedScoreImprovement,
  effort,
  timeframe,
}: MitigationCardProps) {
  return (
    <div className="rounded-[20px] border border-[#eff2ef] bg-white p-5 shadow-[0_8px_26px_rgba(16,38,29,0.05)]">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#152820]">{strategy}</p>
          <p className="mt-1 text-sm leading-6 text-[#2e4a40]">{description}</p>
          {effort && (
            <p className="mt-2 text-xs font-medium text-[#4a5e56]">Effort: {effort}</p>
          )}
        </div>
        <div className="text-right shrink-0 ml-4">
          <span className="text-sm font-medium text-emerald-700">{expectedScoreImprovement}</span>
          <p className="text-xs font-medium text-[#5a6e66]">{timeframe}</p>
        </div>
      </div>
    </div>
  )
}
