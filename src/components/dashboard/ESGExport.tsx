'use client'
import { useState } from 'react'

interface Props {
  reportId: string
}

export default function DownloadPDFButton({ reportId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/export?reportId=${reportId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = (data as { error?: string }).error ?? `Server error ${res.status}`
        throw new Error(msg)
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const filenameMatch = disposition.match(/filename="([^"]+)"/)
      const filename = filenameMatch?.[1] ?? 'esg-report.txt'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="rounded-2xl bg-[#3ac56d] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(58,197,109,0.28)] transition hover:bg-[#35b964] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating PDF…' : 'Download PDF'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
