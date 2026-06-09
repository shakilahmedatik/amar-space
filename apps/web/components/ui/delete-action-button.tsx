'use client'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { useDeleteWithConfirm } from '@/hooks/use-delete-with-confirm'
import { useTranslation } from '@/lib/i18n'

interface DeleteActionButtonProps {
  entityId: string
  deleteFn: (id: string) => Promise<unknown>
  trigger?: React.ReactNode
  buttonLabel?: string
  confirmTitle?: string
  confirmDescription?: string
  confirmLabel?: string
  variant?: 'button' | 'icon'
  successMessage: string
  errorMessage?: string
  redirectPath?: string
  redirectDelay?: number
}

export function DeleteActionButton({
  entityId,
  deleteFn,
  trigger,
  buttonLabel,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  variant = 'button',
  ...options
}: DeleteActionButtonProps) {
  const { t } = useTranslation()
  const {
    showConfirm,
    isDeleting,
    feedback,
    openConfirm,
    closeConfirm,
    handleDelete,
    clearFeedback,
  } = useDeleteWithConfirm({
    deleteFn,
    successMessage: options.successMessage ?? t('common.deleteSuccess'),
    errorMessage: options.errorMessage,
    redirectPath: options.redirectPath,
  })

  return (
    <>
      {feedback && (
        <ErrorFeedback
          message={feedback.message}
          type={feedback.type}
          visible
          onDismiss={clearFeedback}
        />
      )}
      {trigger ? (
        <button
          type="button"
          onClick={openConfirm}
          className="inline-flex items-center bg-transparent p-0 text-inherit"
          aria-label={buttonLabel ?? t('common.delete')}
        >
          {trigger}
        </button>
      ) : (
        <button
          type="button"
          onClick={openConfirm}
          className="min-h-11 rounded-full bg-error-text px-4 py-2 text-sm text-on-dark hover:opacity-90"
        >
          {buttonLabel ?? t('common.delete')}
        </button>
      )}
      <ConfirmDialog
        open={showConfirm}
        onClose={closeConfirm}
        onConfirm={() => handleDelete(entityId)}
        title={confirmTitle ?? t('common.confirmDelete')}
        description={confirmDescription ?? t('common.confirmDeleteDescription')}
        confirmLabel={confirmLabel ?? t('common.delete')}
        destructive
        loading={isDeleting}
      />
    </>
  )
}
