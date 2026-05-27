'use client'

import Image from 'next/image'
import { useParams } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  useAddMaintenanceComment,
  useMaintenanceRequest,
  useUpdateMaintenanceStatus,
} from '@/hooks/use-maintenance'
import type { MaintenanceStatus } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

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

/**
 * Maintenance request detail page — /maintenance/[id]
 * Shows status badge, comments, attachments.
 * Owner/Manager can update status.
 * All roles can add comments.
 * Validates: Requirements 10.1, 10.2, 10.5, 10.6, 10.7, 10.8
 */
export default function MaintenanceDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const requestId = params.id as string

  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

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

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
        setUser(session)
      } catch {
        window.location.href = '/login'
      } finally {
        setIsLoadingSession(false)
      }
    }
    loadSession()
  }, [])

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

  if (isLoadingSession || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4">
          <LoadingSkeleton rows={5} showHeader />
        </div>
      </div>
    )
  }

  const role = user.role as UserRole
  const canUpdateStatus = role === 'owner' || role === 'manager'

  return (
    <DashboardLayout role={role} activePath="/maintenance">
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

      <div style={{ marginBottom: '1.5rem' }}>
        <a
          href="/maintenance"
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            textDecoration: 'none',
          }}
        >
          ← {t('common.back')}
        </a>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : request ? (
        <>
          {/* Request Summary */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                {request.title}
              </h1>
              <StatusBadge status={request.status} />
            </div>

            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('maintenance.priority')}
                </p>
                <StatusBadge status={request.priority} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('maintenance.building')}
                </p>
                <p style={{ fontSize: '1rem', color: '#111827' }}>
                  {request.buildingName}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('maintenance.flat')}
                </p>
                <p style={{ fontSize: '1rem', color: '#111827' }}>
                  {request.flatNumber}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('maintenance.renter')}
                </p>
                <p style={{ fontSize: '1rem', color: '#111827' }}>
                  {request.renterName}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('maintenance.createdAt')}
                </p>
                <p style={{ fontSize: '1rem', color: '#111827' }}>
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Description */}
            <div
              style={{
                padding: '1rem',
                borderRadius: '0.375rem',
                backgroundColor: '#f9fafb',
                border: '1px solid #f3f4f6',
              }}
            >
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#6b7280',
                  marginBottom: '0.5rem',
                }}
              >
                {t('maintenance.description')}
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#374151',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {request.description}
              </p>
            </div>

            {/* Status Update Controls (Owner/Manager) */}
            {canUpdateStatus && request.status !== 'closed' && (
              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '0.75rem',
                  }}
                >
                  {t('maintenance.updateStatus')}
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  {getValidTransitions(request.status).map((newStatus) => (
                    <button
                      key={newStatus}
                      type="button"
                      onClick={() => handleStatusUpdate(newStatus)}
                      disabled={statusMutation.isPending}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '44px',
                        minHeight: '44px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        borderRadius: '0.375rem',
                        backgroundColor:
                          newStatus === 'closed'
                            ? '#fee2e2'
                            : newStatus === 'resolved'
                              ? '#dcfce7'
                              : '#dbeafe',
                        color:
                          newStatus === 'closed'
                            ? '#991b1b'
                            : newStatus === 'resolved'
                              ? '#166534'
                              : '#1e40af',
                        border: 'none',
                        cursor: statusMutation.isPending
                          ? 'not-allowed'
                          : 'pointer',
                        opacity: statusMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      {newStatus === 'in_progress' &&
                      request.status === 'resolved'
                        ? t('maintenance.reopen')
                        : getStatusButtonLabel(newStatus)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attachments Section */}
          {request.attachments.length > 0 && (
            <div
              style={{
                padding: '1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                marginBottom: '1.5rem',
              }}
            >
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '1rem',
                }}
              >
                {t('maintenance.attachments')} ({request.attachments.length})
              </h2>
              <div
                style={{
                  display: 'grid',
                  gap: '0.75rem',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                }}
              >
                {request.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      borderRadius: '0.375rem',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                      textDecoration: 'none',
                    }}
                  >
                    <Image
                      src={attachment.fileUrl}
                      alt={attachment.fileName}
                      width={200}
                      height={120}
                      style={{
                        width: '100%',
                        height: '120px',
                        objectFit: 'cover',
                      }}
                      unoptimized
                    />
                    <div style={{ padding: '0.5rem' }}>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#374151',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {attachment.fileName}
                      </p>
                      <p
                        style={{
                          fontSize: '0.6875rem',
                          color: '#9ca3af',
                        }}
                      >
                        {(attachment.fileSize / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
            }}
          >
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '1rem',
              }}
            >
              {t('maintenance.comments')} ({request.comments.length})
            </h2>

            {/* Comment List */}
            {request.comments.length === 0 ? (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  textAlign: 'center',
                  padding: '1.5rem',
                }}
              >
                {t('maintenance.noComments')}
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                {request.comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '0.375rem',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #f3f4f6',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: '#374151',
                        }}
                      >
                        {comment.authorName}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#9ca3af',
                        }}
                      >
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: '#374151',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Form */}
            <div
              style={{
                paddingTop: '1rem',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <h3
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '0.75rem',
                }}
              >
                {t('maintenance.addComment')}
              </h3>
              {commentError && (
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#dc2626',
                    marginBottom: '0.5rem',
                  }}
                >
                  {commentError}
                </p>
              )}
              <form onSubmit={handleAddComment}>
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder={t('maintenance.commentPlaceholder')}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    border: `1px solid ${commentError ? '#dc2626' : '#d1d5db'}`,
                    minHeight: '44px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    marginBottom: '0.5rem',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                    }}
                  >
                    {commentContent.length}/2000
                  </span>
                  <button
                    type="submit"
                    disabled={commentMutation.isPending}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      borderRadius: '0.375rem',
                      backgroundColor: commentMutation.isPending
                        ? '#93c5fd'
                        : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      cursor: commentMutation.isPending
                        ? 'not-allowed'
                        : 'pointer',
                    }}
                  >
                    {commentMutation.isPending
                      ? t('common.loading')
                      : t('maintenance.addComment')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  )
}
