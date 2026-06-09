'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useTranslation } from '@/lib/i18n'

interface UseDeleteWithConfirmOptions {
  deleteFn: (id: string) => Promise<unknown>
  successMessage: string
  errorMessage?: string
  redirectPath?: string
  redirectDelay?: number
}

interface UseDeleteWithConfirmReturn {
  showConfirm: boolean
  isDeleting: boolean
  feedback: { message: string; type: 'success' | 'error' } | null
  openConfirm: () => void
  closeConfirm: () => void
  handleDelete: (id: string) => Promise<void>
  clearFeedback: () => void
}

export function useDeleteWithConfirm(
  options: UseDeleteWithConfirmOptions,
): UseDeleteWithConfirmReturn {
  const {
    deleteFn,
    successMessage,
    errorMessage,
    redirectPath,
    redirectDelay = 1500,
  } = options
  const router = useRouter()
  const { t } = useTranslation()

  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [feedback, setFeedback] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  const openConfirm = useCallback(() => setShowConfirm(true), [])
  const closeConfirm = useCallback(() => setShowConfirm(false), [])
  const clearFeedback = useCallback(() => setFeedback(null), [])

  const handleDelete = useCallback(
    async (id: string) => {
      setIsDeleting(true)
      try {
        await deleteFn(id)
        setFeedback({ message: successMessage, type: 'success' })
        setShowConfirm(false)
        if (redirectPath) {
          setTimeout(() => {
            router.push(redirectPath)
          }, redirectDelay)
        }
      } catch (err) {
        setFeedback({
          message:
            err instanceof Error
              ? err.message
              : (errorMessage ?? t('common.error')),
          type: 'error',
        })
        setShowConfirm(false)
      } finally {
        setIsDeleting(false)
      }
    },
    [
      deleteFn,
      successMessage,
      errorMessage,
      redirectPath,
      redirectDelay,
      router,
      t,
    ],
  )

  return {
    showConfirm,
    isDeleting,
    feedback,
    openConfirm,
    closeConfirm,
    handleDelete,
    clearFeedback,
  }
}
