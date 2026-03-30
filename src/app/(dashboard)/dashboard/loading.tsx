export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-5 lg:px-6 lg:py-6">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 h-9 w-64 rounded-lg bg-[#edf2ee]" />
          <div className="h-4 w-40 rounded bg-[#edf2ee]" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-[#edf2ee]" />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[18px] bg-[linear-gradient(135deg,#2d5d4c_0%,#356d59_100%)] opacity-50" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="h-20 rounded-[20px] border border-[#eff2ef] bg-[#fbfcfb]" />
        <div className="h-20 rounded-[20px] border border-[#eff2ef] bg-[#fbfcfb]" />
      </div>

      <div className="mb-8 h-24 rounded-[20px] border border-[#eff2ef] bg-[#fbfcfb]" />

      <div className="mb-4 h-7 w-48 rounded bg-[#edf2ee]" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-[20px] border border-[#eff2ef] bg-[#fbfcfb]" />
        ))}
      </div>
    </div>
  )
}
