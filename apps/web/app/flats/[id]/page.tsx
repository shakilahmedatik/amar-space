'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  getValidStatusTransitions,
  useDeleteFlat,
  useFlat,
  useUpdateFlat,
} from '@/hooks/use-flats'
import type { FlatStatus } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Flat detail page — /flats/[id]
 * Shows flat info with status badge, status transition controls, and delete option.
 * Validates: Requirements 6.7, 6.8, 6.9, 6.13
 */
export default function FlatDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const router = useRouter()
  const flatId = params.id as string

  const [role, setRole] = useState<UserRole>('owner')
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [feedback, setFeedback] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  const { data: flat, isLoading, error } = useFlat(flatId)
  const updateFlatMutation = useUpdateFlat()
  const deleteFlatMutation = useDeleteFlat()

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          router.push('/login')
          return
        }
        setRole(session.role as UserRole)
      } catch {
        router.push('/login')
      } finally {
        setIsLoadingSession(false)
      }
    }
    loadSession()
  }, [])

  const handleStatusTransition = useCallback(
    async (newStatus: FlatStatus) => {
      try {
        await updateFlatMutation.mutateAsync({
          id: flatId,
          data: { status: newStatus },
        })
        setFeedback({ message: t('flats.updateSuccess'), type: 'success' })
      } catch (err) {
        setFeedback({
          message: err instanceof Error ? err.message : t('common.error'),
          type: 'error',
        })
      }
    },
    [flatId, updateFlatMutation, t],
  )

  const handleDelete = useCallback(async () => {
    try {
      await deleteFlatMutation.mutateAsync(flatId)
      setFeedback({ message: t('flats.deleteSuccess'), type: 'success' })
      setShowDeleteDialog(false)
      setTimeout(() => {
        router.push('/flats')
      }, 1500)
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : t('common.error'),
        type: 'error',
      })
      setShowDeleteDialog(false)
    }
  }, [flatId, deleteFlatMutation, t])

  if (isLoadingSession || isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <div className="w-full max-w-md px-4">
          <LoadingSkeleton rows={5} showHeader />
        </div>
      </div>
    )
  }

  if (error || !flat) {
    return (
      <DashboardLayout role={role} activePath="/flats">
        <ErrorFeedback
          message={error?.message || t('common.error')}
          type="error"
          visible
        />
        <a
          href="/flats"
          className="inline-flex items-center min-h-[44px] text-sm text-brand-blue-deep no-underline"
        >
          ← {t('common.back')}
        </a>
      </DashboardLayout>
    )
  }

  const validTransitions = getValidStatusTransitions(flat.status)
  const canDelete = flat.status === 'vacant' && role === 'owner'
  const canChangeStatus = role === 'owner' || role === 'manager'

  return (
    <DashboardLayout role={role} activePath="/flats">
      {feedback && (
        <ErrorFeedback
          message={feedback.message}
          type={feedback.type}
          visible
          onDismiss={() => setFeedback(null)}
        />
      )}

      <div className="max-w-160 mx-auto">
        <div className="mb-6">
          <a
            href="/flats"
            className="inline-flex items-center min-h-[44px] text-sm text-brand-blue-deep no-underline"
          >
            ← {t('common.back')}
          </a>
        </div>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-ink">
            {t('flats.flatDetail')}
          </h1>
          <StatusBadge status={flat.status} />
        </div>

        {/* Flat Information Card */}
        <Card className="bg-canvas rounded-xl border border-hairline mb-6">
          <CardContent className="p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoItem label={t('flats.flatNumber')} value={flat.flatNumber} />
              <InfoItem label={t('flats.floor')} value={String(flat.floor)} />
              <InfoItem
                label={t('flats.building')}
                value={flat.buildingName || '—'}
              />
              <InfoItem
                label={t('flats.createdAt')}
                value={formatDate(flat.createdAt)}
              />
              <InfoItem
                label={t('flats.updatedAt')}
                value={formatDate(flat.updatedAt)}
              />
            </dl>
          </CardContent>
        </Card>

        {/* Status Transition Controls (Owner/Manager) */}
        {canChangeStatus && validTransitions.length > 0 && (
          <Card className="bg-canvas rounded-xl border border-hairline mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-charcoal">
                {t('flats.statusTransition')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="flex gap-3 flex-wrap">
                {validTransitions.map((targetStatus) => (
                  <Button
                    key={targetStatus}
                    type="button"
                    variant="outline"
                    onClick={() => handleStatusTransition(targetStatus)}
                    disabled={updateFlatMutation.isPending}
                    className={[
                      'rounded-full min-h-[44px]',
                      targetStatus === 'maintenance'
                        ? 'bg-warning-bg text-warning-text border-warning-text/30'
                        : 'bg-success-bg text-success-text border-success-text/30',
                    ].join(' ')}
                  >
                    {targetStatus === 'maintenance'
                      ? t('flats.setUnderMaintenance')
                      : t('flats.setVacant')}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Action (Owner only, Vacant flats only) */}
        {role === 'owner' && (
          <Card className="bg-canvas rounded-xl border border-hairline">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-charcoal">
                {t('flats.actions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {canDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="rounded-full min-h-[44px] bg-error-text text-on-dark"
                >
                  {t('flats.deleteFlat')}
                </Button>
              ) : (
                <p className="text-sm text-steel">
                  {t('flats.deleteNotAllowed')}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title={t('flats.deleteConfirmTitle')}
        description={t('flats.deleteConfirmDescription')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={deleteFlatMutation.isPending}
      />
    </DashboardLayout>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-steel uppercase tracking-wide mb-1">
        {label}
      </dt>
      <dd className="text-base font-medium text-ink">{value}</dd>
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB') // DD/MM/YYYY
  } catch {
    return dateStr
  }
}
