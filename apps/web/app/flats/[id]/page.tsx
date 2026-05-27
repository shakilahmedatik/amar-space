'use client'

import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
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
          window.location.href = '/login'
          return
        }
        setRole(session.role as UserRole)
      } catch {
        window.location.href = '/login'
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
        window.location.href = '/flats'
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
      <div className="flex h-dvh items-center justify-center bg-gray-50">
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
          style={{
            color: '#2563eb',
            fontSize: '0.875rem',
            textDecoration: 'none',
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
          }}
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

      <div style={{ maxWidth: '40rem', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <a
            href="/flats"
            style={{
              color: '#2563eb',
              fontSize: '0.875rem',
              textDecoration: 'none',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            ← {t('common.back')}
          </a>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#111827',
            }}
          >
            {t('flats.flatDetail')}
          </h1>
          <StatusBadge status={flat.status} />
        </div>

        {/* Flat Information Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.25rem',
            }}
          >
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
          </div>
        </div>

        {/* Status Transition Controls (Owner/Manager) */}
        {canChangeStatus && validTransitions.length > 0 && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '1rem',
              }}
            >
              {t('flats.statusTransition')}
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {validTransitions.map((targetStatus) => (
                <button
                  key={targetStatus}
                  type="button"
                  onClick={() => handleStatusTransition(targetStatus)}
                  disabled={updateFlatMutation.isPending}
                  style={{
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.625rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor:
                      targetStatus === 'under_maintenance'
                        ? '#fef3c7'
                        : '#dcfce7',
                    color:
                      targetStatus === 'under_maintenance'
                        ? '#92400e'
                        : '#166534',
                    cursor: updateFlatMutation.isPending
                      ? 'not-allowed'
                      : 'pointer',
                    opacity: updateFlatMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {targetStatus === 'under_maintenance'
                    ? t('flats.setUnderMaintenance')
                    : t('flats.setVacant')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Delete Action (Owner only, Vacant flats only) */}
        {role === 'owner' && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              padding: '1.5rem',
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '1rem',
              }}
            >
              {t('flats.actions')}
            </h2>
            {canDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                {t('flats.deleteFlat')}
              </button>
            ) : (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                }}
              >
                {t('flats.deleteNotAllowed')}
              </p>
            )}
          </div>
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
      <dt
        style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.25rem',
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontSize: '1rem',
          fontWeight: 500,
          color: '#111827',
        }}
      >
        {value}
      </dd>
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
