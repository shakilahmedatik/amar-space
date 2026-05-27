'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
}

/**
 * Confirmation dialog for destructive actions.
 * Uses native dialog element. 44x44px minimum touch targets.
 * Validates: Requirement 16.4
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  loading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const resolvedConfirmLabel = confirmLabel || t('common.confirm')
  const resolvedCancelLabel = cancelLabel || t('common.cancel')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      cancelRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const handleCancel = useCallback(() => {
    onClose()
  }, [onClose])
  const handleConfirm = useCallback(() => {
    if (!loading) onConfirm()
  }, [onConfirm, loading])

  const handleDialogClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) onClose()
    },
    [onClose],
  )

  const handleDialogCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault()
      onClose()
    },
    [onClose],
  )

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      }}
      onCancel={handleDialogCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      style={{
        position: 'fixed',
        inset: 0,
        margin: 'auto',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        maxWidth: '28rem',
        width: 'calc(100% - 2rem)',
        boxShadow:
          '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
      }}
    >
      <h2
        id="confirm-dialog-title"
        style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          marginBottom: '0.5rem',
        }}
      >
        {title}
      </h2>
      <p
        id="confirm-dialog-description"
        style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          marginBottom: '1.5rem',
          lineHeight: '1.5',
        }}
      >
        {description}
      </p>
      <div
        style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}
      >
        <button
          ref={cancelRef}
          type="button"
          onClick={handleCancel}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '0.625rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            backgroundColor: 'transparent',
            color: 'var(--foreground)',
            cursor: 'pointer',
          }}
        >
          {resolvedCancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '0.625rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: destructive ? '#dc2626' : '#2563eb',
            color: '#ffffff',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? t('common.loading') : resolvedConfirmLabel}
        </button>
      </div>
    </dialog>
  )
}
