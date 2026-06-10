'use client'

import { AlertCircle, Home, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/10 bg-white p-6 shadow-xl dark:bg-zinc-900 dark:border-rose-500/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400 mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          Something went wrong
        </h2>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          {error.message ||
            'An unexpected error occurred while loading this page.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm px-4 py-2.5 transition-colors dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>

          <a
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium text-sm px-4 py-2.5 transition-colors cursor-pointer"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
