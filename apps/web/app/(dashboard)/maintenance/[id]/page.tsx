'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useSession } from '@/contexts/session-context'
import {
  useAddMaintenanceComment,
  useMaintenanceRequest,
  useUpdateMaintenanceStatus,
} from '@/hooks/use-maintenance'
import type { MaintenanceStatus } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Valid status transitions for maintenance requests.
 * Open → In_Progress, Closed
 * In_Progress → Resolved, Closed
 * Resolved → Closed, In_Progress (re-open)
 */
function getValidTransitions(
  currentStatus: MaintenanceStatus,
): MaintenanceStatus[] {
  switch (currentStatus) {
    case 'open':
      return ['in_progress', 'closed']
    case 'in_progress':
      return ['resolved', 'closed']
    case 'resolved':
      return ['closed', 'in_progress']
    case 'closed':
      return []
    default:
      return []
  }
}

/** Returns Tailwind classes for each status transition button */
function getStatusButtonClasses(status: MaintenanceStatus): string {
  switch (status) {
    case 'closed':
      return 'bg-error-bg text-error-text hover:bg-error-bg/80'
    case 'resolved':
      return 'bg-success-bg text-success-text hover:bg-success-bg/80'
    default:
      return 'bg-brand-blue-200 text-brand-blue-deep hover:bg-brand-blue-200/80'
  }
}

/**
 * Maintenance request detail page — /maintenance/[id]
 * Shows status badge, comments, attachments.
 * Owner/Manager can update status.
 * All roles can add comments.
 */
export default function MaintenanceDetailPage() {
  const { role } = useSession()
  const { t } = useTranslation()
  const params = useParams()
  const _router = useRouter()
  const requestId = params.id as string
  // Comment form state
  const [commentContent, setCommentContent] = useState('')
  const [commentError, setCommentError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const {
    data: request,
    isLoading,
    isError,
    error,
  } = useMaintenanceRequest(requestId)
  const statusMutation = useUpdateMaintenanceStatus(requestId)
  const commentMutation = useAddMaintenanceComment(requestId)
  async function handleStatusUpdate(newStatus: MaintenanceStatus) {
    try {
      await statusMutation.mutateAsync({ status: newStatus })
      setSuccessMessage(t('maintenance.statusUpdateSuccess'))
    } catch (err) {
      setSuccessMessage('')
      setCommentError(
        err instanceof Error ? err.message : t('maintenance.statusUpdateError'),
      )
    }
  }

  async function handleAddComment(e: FormEvent) {
    e.preventDefault()
    setCommentError('')

    if (!commentContent.trim()) {
      setCommentError(t('maintenance.commentRequired'))
      return
    }
    if (commentContent.trim().length > 2000) {
      setCommentError(t('maintenance.commentMaxLength'))
      return
    }

    try {
      await commentMutation.mutateAsync({ content: commentContent.trim() })
      setCommentContent('')
      setSuccessMessage(t('maintenance.commentSuccess'))
    } catch (err) {
      setCommentError(
        err instanceof Error ? err.message : t('maintenance.commentError'),
      )
    }
  }

  function getStatusButtonLabel(status: MaintenanceStatus): string {
    switch (status) {
      case 'in_progress':
        return t('maintenance.setInProgress')
      case 'resolved':
        return t('maintenance.setResolved')
      case 'closed':
        return t('maintenance.setClosed')
      default:
        return status
    }
  }
  const canUpdateStatus =
    role === 'owner' ||
    role === 'manager' ||
    role === 'security_guard' ||
    role === 'care_taker'

  return (
    <>
      {successMessage && (
        <ErrorFeedback
          message={successMessage}
          type="success"
          visible
          onDismiss={() => setSuccessMessage('')}
        />
      )}
      {isError && (
        <ErrorFeedback
          message={error?.message || t('maintenance.loadError')}
          type="error"
          visible
        />
      )}

      <div className="mb-6">
        <Link
          href="/maintenance"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : request ? (
        <>
          {/* Request Summary */}
          <div className="p-6 rounded-xl border border-hairline bg-canvas mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h1 className="text-2xl font-bold text-ink">{request.title}</h1>
              <StatusBadge status={request.status} />
            </div>

            <div className="grid gap-4 mb-5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
              <div>
                <p className="text-xs font-medium text-steel mb-1">
                  {t('maintenance.priority')}
                </p>
                <StatusBadge status={request.priority} />
              </div>
              <div>
                <p className="text-xs font-medium text-steel mb-1">
                  {t('maintenance.building')}
                </p>
                <p className="text-base text-ink">{request.buildingName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-steel mb-1">
                  {t('maintenance.flat')}
                </p>
                <p className="text-base text-ink">{request.flatNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-steel mb-1">
                  {t('maintenance.renter')}
                </p>
                <p className="text-base text-ink">{request.renterName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-steel mb-1">
                  {t('maintenance.createdAt')}
                </p>
                <p className="text-base text-ink">
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-md bg-surface-soft border border-hairline-soft">
              <p className="text-xs font-medium text-steel mb-2">
                {t('maintenance.description')}
              </p>
              <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">
                {request.description}
              </p>
            </div>

            {/* Status Update Controls (Owner/Manager) */}
            {canUpdateStatus && request.status !== 'closed' && (
              <div className="mt-5 pt-5 border-t border-hairline">
                <p className="text-sm font-semibold text-charcoal mb-3">
                  {t('maintenance.updateStatus')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {getValidTransitions(request.status).map((newStatus) => (
                    <Button
                      key={newStatus}
                      type="button"
                      onClick={() => handleStatusUpdate(newStatus)}
                      disabled={statusMutation.isPending}
                      className={[
                        'rounded-full min-h-11 border-0',
                        getStatusButtonClasses(newStatus),
                      ].join(' ')}
                    >
                      {newStatus === 'in_progress' &&
                      request.status === 'resolved'
                        ? t('maintenance.reopen')
                        : getStatusButtonLabel(newStatus)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attachments Section */}
          {request.attachments.length > 0 && (
            <div className="p-6 rounded-xl border border-hairline bg-canvas mb-6">
              <h2 className="text-lg font-semibold text-ink mb-4">
                {t('maintenance.attachments')} ({request.attachments.length})
              </h2>
              <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
                {request.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md border border-hairline overflow-hidden no-underline"
                  >
                    <Image
                      src={attachment.fileUrl}
                      alt={attachment.fileName}
                      width={200}
                      height={120}
                      className="w-full object-cover h-[120px]"
                      unoptimized
                    />
                    <div className="p-2">
                      <p className="text-xs text-charcoal overflow-hidden text-ellipsis whitespace-nowrap">
                        {attachment.fileName}
                      </p>
                      <p className="text-[0.6875rem] text-stone">
                        {(attachment.fileSize / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="p-6 rounded-xl border border-hairline bg-canvas">
            <h2 className="text-lg font-semibold text-ink mb-4">
              {t('maintenance.comments')} ({request.comments.length})
            </h2>

            {/* Comment List */}
            {request.comments.length === 0 ? (
              <p className="text-sm text-steel text-center py-6">
                {t('maintenance.noComments')}
              </p>
            ) : (
              <div className="flex flex-col gap-4 mb-6">
                {request.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 rounded-md bg-surface-soft border border-hairline-soft"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[0.8125rem] font-semibold text-charcoal">
                        {comment.authorName}
                      </span>
                      <span className="text-xs text-stone">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Form */}
            <div className="pt-4 border-t border-hairline">
              <h3 className="text-sm font-semibold text-charcoal mb-3">
                {t('maintenance.addComment')}
              </h3>
              {commentError && (
                <p className="text-xs text-error-text mb-2">{commentError}</p>
              )}
              <form onSubmit={handleAddComment}>
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder={t('maintenance.commentPlaceholder')}
                  className={[
                    'w-full px-3 py-2 text-sm rounded-md border min-h-11 resize-y font-[inherit] mb-2',
                    commentError
                      ? 'border-error-text bg-error-bg'
                      : 'border-hairline bg-canvas',
                  ].join(' ')}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-steel">
                    {commentContent.length}/2000
                  </span>
                  <Button
                    type="submit"
                    disabled={commentMutation.isPending}
                    className="rounded-full min-h-11 bg-primary text-on-primary font-semibold"
                  >
                    {commentMutation.isPending
                      ? t('common.loading')
                      : t('maintenance.addComment')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
