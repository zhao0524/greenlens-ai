'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-[28px] border border-[#e6ede8] bg-white p-8 text-center shadow-[0_18px_50px_rgba(18,38,29,0.08)]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-500">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[#152820]">Something went wrong</h2>
        <p className="mb-6 text-sm leading-6 text-[#4a5e56]">{error.message ?? 'An unexpected error occurred loading the dashboard.'}</p>
        <button
          onClick={reset}
          className="rounded-2xl bg-[#3ac56d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#35b964]"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
