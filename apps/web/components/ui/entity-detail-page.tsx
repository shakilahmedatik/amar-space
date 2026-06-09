'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useTranslation } from '@/lib/i18n'

interface EntityDetailPageProps {
  isLoading: boolean
  error: Error | null
  backHref: string
  backLabel?: string
  title?: string
  actions?: ReactNode
  children: ReactNode
}

export function EntityDetailPage({
  isLoading,
  error,
  backHref,
  backLabel,
  title,
  actions,
  children,
}: EntityDetailPageProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <div className="w-full max-w-md px-4">
          <LoadingSkeleton rows={5} showHeader />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <>
        <ErrorFeedback
          message={error.message || t('common.error')}
          type="error"
          visible
        />
        <Link
          href={backHref}
          className="inline-flex items-center min-h-11 text-sm text-brand-blue-deep no-underline"
        >
          ← {backLabel ?? t('common.back')}
        </Link>
      </>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center min-h-11 text-sm text-brand-blue-deep no-underline"
          >
            ← {backLabel ?? t('common.back')}
          </Link>
          {title && (
            <h1 className="mt-2 text-2xl font-bold text-on-surface">{title}</h1>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
