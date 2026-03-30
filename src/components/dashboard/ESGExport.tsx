'use client'

export default function DownloadPDFButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-2xl bg-[#3ac56d] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(58,197,109,0.28)] transition hover:bg-[#35b964]"
    >
      Download PDF
    </button>
  )
}
