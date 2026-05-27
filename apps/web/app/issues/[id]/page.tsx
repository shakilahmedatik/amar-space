'use client'

import { useParams } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  useAssignIssue,
  useIssue,
  useUpdateIssueStatus,
} from '@/hooks/use-issues'
import type { IssueStatus } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/** Valid status transitions for issues */
const VALID_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  open: ['in_progress', 'resolved', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
}

/**
 * Issue detail page — /issues/[id]
 * Shows issue info with status, assignee, resolution notes.
 * Owner/Manager can update status and assign.
 * Validates: Requirements 11.1, 11.2, 11.4, 11.5
 */
export default function IssueDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const issueId = params.id as string

  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  // Status update state
  const [showStatusForm, setShowStatusForm] = useState(false)
  const [newStatus, setNewStatus] = useState<IssueStatus | ''>('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({})

  // Assignment state
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [assigneeId, setAssigneeId] = useState('')
  const [assignErrors, setAssignErrors] = useState<Record<string, string>>({})

  const [successMessage, setSuccessMessage] = useState('')

  const { data: issue, isLoading, isError, error } = useIssue(issueId)
  const statusMutation = useUpdateIssueStatus(issueId)
  const assignMutation = useAssignIssue(issueId)

  // Fetch managers for assignment dropdown
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>(
    [],
  )

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

  // Load managers for assignment
  useEffect(() => {
    async function loadManagers() {
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(
          `${API_URL}/api/renters?role=manager&pageSize=100`,
          { credentials: 'include' },
        )
        if (response.ok) {
          const data = await response.json()
          setManagers(data.data ?? [])
        }
      } catch {
        // Silently fail — managers list is optional
      }
    }
    if (user && (user.role === 'owner' || user.role === 'manager')) {
      loadManagers()
    }
  }, [user])

  function validateStatusUpdate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!newStatus) {
      newErrors.status = t('issues.statusRequired')
    }

    // Resolution notes required when marking as Resolved
    if (newStatus === 'resolved' && !resolutionNotes.trim()) {
      newErrors.resolutionNotes = t('issues.resolutionNotesRequired')
    } else if (resolutionNotes.trim().length > 2000) {
      newErrors.resolutionNotes = t('issues.resolutionNotesMaxLength')
    }

    setStatusErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleStatusUpdate(e: FormEvent) {
    e.preventDefault()
    if (!validateStatusUpdate()) return

    try {
      await statusMutation.mutateAsync({
        status: newStatus as IssueStatus,
        resolutionNotes:
          newStatus === 'resolved' ? resolutionNotes.trim() : undefined,
      })
      setShowStatusForm(false)
      setNewStatus('')
      setResolutionNotes('')
      setStatusErrors({})
      setSuccessMessage(t('issues.statusUpdateSuccess'))
    } catch (err) {
      setStatusErrors({
        form:
          err instanceof Error ? err.message : t('issues.statusUpdateError'),
      })
    }
  }

  async function handleAssign(e: FormEvent) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!assigneeId) {
      newErrors.assigneeId = t('issues.assigneeRequired')
    }

    if (Object.keys(newErrors).length > 0) {
      setAssignErrors(newErrors)
      return
    }

    try {
      await assignMutation.mutateAsync({ assigneeId })
      setShowAssignForm(false)
      setAssigneeId('')
      setAssignErrors({})
      setSuccessMessage(t('issues.assignSuccess'))
    } catch (err) {
      setAssignErrors({
        form: err instanceof Error ? err.message : t('issues.assignError'),
      })
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
  const canManage = role === 'owner' || role === 'manager'
  const availableTransitions = issue
    ? (VALID_TRANSITIONS[issue.status] ?? [])
    : []

  return (
    <DashboardLayout role={role} activePath="/issues">
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
          message={error?.message || t('issues.loadError')}
          type="error"
          visible
        />
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <a
          href="/issues"
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
      ) : issue ? (
        <>
          {/* Issue Summary */}
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
                {issue.title}
              </h1>
              <StatusBadge status={issue.status} />
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
                  {t('issues.building')}
                </p>
                <p style={{ fontSize: '1rem', color: '#111827' }}>
                  {issue.buildingName || '—'}
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
                  {t('issues.category')}
                </p>
                <p
                  style={{
                    fontSize: '1rem',
                    color: '#111827',
                    textTransform: 'capitalize',
                  }}
                >
                  {t(`issues.${issue.category}`)}
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
                  {t('issues.priority')}
                </p>
                <StatusBadge status={issue.priority} />
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
                  {t('issues.assignee')}
                </p>
                <p style={{ fontSize: '1rem', color: '#111827' }}>
                  {issue.assigneeName || t('issues.unassigned')}
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
                  {t('issues.createdAt')}
                </p>
                <p style={{ fontSize: '1rem', color: '#111827' }}>
                  {new Date(issue.createdAt).toLocaleDateString()}
                </p>
              </div>
              {issue.resolvedAt && (
                <div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {t('issues.resolvedAt')}
                  </p>
                  <p style={{ fontSize: '1rem', color: '#111827' }}>
                    {new Date(issue.resolvedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1rem' }}>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#6b7280',
                  marginBottom: '0.5rem',
                }}
              >
                {t('issues.description')}
              </p>
              <p
                style={{
                  fontSize: '0.9375rem',
                  color: '#374151',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {issue.description}
              </p>
            </div>

            {/* Resolution Notes */}
            {issue.resolutionNotes && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '0.375rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                }}
              >
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#166534',
                    marginBottom: '0.5rem',
                  }}
                >
                  {t('issues.resolutionNotes')}
                </p>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: '#166534',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {issue.resolutionNotes}
                </p>
              </div>
            )}
          </div>

          {/* Action Controls */}
          {canManage && (
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
                {t('issues.actions')}
              </h2>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  marginBottom: '1rem',
                }}
              >
                {/* Status Update Button */}
                {availableTransitions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowStatusForm(!showStatusForm)
                      setShowAssignForm(false)
                    }}
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
                      backgroundColor: showStatusForm
                        ? '#e5e7eb'
                        : 'transparent',
                      color: '#2563eb',
                      border: '1px solid #2563eb',
                      cursor: 'pointer',
                    }}
                  >
                    {t('issues.updateStatus')}
                  </button>
                )}

                {/* Assign Button */}
                {issue.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignForm(!showAssignForm)
                      setShowStatusForm(false)
                    }}
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
                      backgroundColor: showAssignForm
                        ? '#e5e7eb'
                        : 'transparent',
                      color: '#7c3aed',
                      border: '1px solid #7c3aed',
                      cursor: 'pointer',
                    }}
                  >
                    {t('issues.assignIssue')}
                  </button>
                )}
              </div>

              {/* Status Update Form */}
              {showStatusForm && (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                    marginBottom: '1rem',
                  }}
                >
                  {statusErrors.form && (
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: '#dc2626',
                        marginBottom: '0.75rem',
                      }}
                    >
                      {statusErrors.form}
                    </p>
                  )}
                  <form onSubmit={handleStatusUpdate}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label
                        htmlFor="new-status"
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#374151',
                          marginBottom: '0.375rem',
                        }}
                      >
                        {t('issues.newStatus')}
                      </label>
                      <select
                        id="new-status"
                        value={newStatus}
                        onChange={(e) =>
                          setNewStatus(e.target.value as IssueStatus | '')
                        }
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.875rem',
                          borderRadius: '0.375rem',
                          border: `1px solid ${statusErrors.status ? '#dc2626' : '#d1d5db'}`,
                          minHeight: '44px',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="">{t('issues.selectStatus')}</option>
                        {availableTransitions.map((s) => {
                          const statusLabels: Record<IssueStatus, string> = {
                            open: t('issues.statusOpen'),
                            in_progress: t('issues.statusInProgress'),
                            resolved: t('issues.statusResolved'),
                            closed: t('issues.statusClosed'),
                          }
                          return (
                            <option key={s} value={s}>
                              {statusLabels[s]}
                            </option>
                          )
                        })}
                      </select>
                      {statusErrors.status && (
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: '#dc2626',
                            marginTop: '0.25rem',
                          }}
                        >
                          {statusErrors.status}
                        </p>
                      )}
                    </div>

                    {/* Resolution Notes (required when resolving) */}
                    {newStatus === 'resolved' && (
                      <div style={{ marginBottom: '1rem' }}>
                        <label
                          htmlFor="resolution-notes"
                          style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#374151',
                            marginBottom: '0.375rem',
                          }}
                        >
                          {t('issues.resolutionNotes')}{' '}
                          <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <textarea
                          id="resolution-notes"
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          maxLength={2000}
                          rows={4}
                          placeholder={t('issues.resolutionNotesPlaceholder')}
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.875rem',
                            borderRadius: '0.375rem',
                            border: `1px solid ${statusErrors.resolutionNotes ? '#dc2626' : '#d1d5db'}`,
                            minHeight: '100px',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                          }}
                        />
                        {statusErrors.resolutionNotes && (
                          <p
                            style={{
                              fontSize: '0.75rem',
                              color: '#dc2626',
                              marginTop: '0.25rem',
                            }}
                          >
                            {statusErrors.resolutionNotes}
                          </p>
                        )}
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginTop: '0.25rem',
                          }}
                        >
                          {resolutionNotes.length}/2000
                        </p>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowStatusForm(false)
                          setNewStatus('')
                          setResolutionNotes('')
                          setStatusErrors({})
                        }}
                        style={{
                          minWidth: '44px',
                          minHeight: '44px',
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          borderRadius: '0.375rem',
                          backgroundColor: 'transparent',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          cursor: 'pointer',
                        }}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={statusMutation.isPending}
                        style={{
                          minWidth: '44px',
                          minHeight: '44px',
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          borderRadius: '0.375rem',
                          backgroundColor: statusMutation.isPending
                            ? '#93c5fd'
                            : '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          cursor: statusMutation.isPending
                            ? 'not-allowed'
                            : 'pointer',
                        }}
                      >
                        {statusMutation.isPending
                          ? t('common.loading')
                          : t('issues.updateStatus')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Assignment Form */}
              {showAssignForm && (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                  }}
                >
                  {assignErrors.form && (
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: '#dc2626',
                        marginBottom: '0.75rem',
                      }}
                    >
                      {assignErrors.form}
                    </p>
                  )}
                  <form onSubmit={handleAssign}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label
                        htmlFor="assignee-select"
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#374151',
                          marginBottom: '0.375rem',
                        }}
                      >
                        {t('issues.selectAssignee')}
                      </label>
                      <select
                        id="assignee-select"
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.875rem',
                          borderRadius: '0.375rem',
                          border: `1px solid ${assignErrors.assigneeId ? '#dc2626' : '#d1d5db'}`,
                          minHeight: '44px',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="">{t('issues.selectAssignee')}</option>
                        {managers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      {assignErrors.assigneeId && (
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: '#dc2626',
                            marginTop: '0.25rem',
                          }}
                        >
                          {assignErrors.assigneeId}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowAssignForm(false)
                          setAssigneeId('')
                          setAssignErrors({})
                        }}
                        style={{
                          minWidth: '44px',
                          minHeight: '44px',
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          borderRadius: '0.375rem',
                          backgroundColor: 'transparent',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          cursor: 'pointer',
                        }}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={assignMutation.isPending}
                        style={{
                          minWidth: '44px',
                          minHeight: '44px',
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          borderRadius: '0.375rem',
                          backgroundColor: assignMutation.isPending
                            ? '#a78bfa'
                            : '#7c3aed',
                          color: '#ffffff',
                          border: 'none',
                          cursor: assignMutation.isPending
                            ? 'not-allowed'
                            : 'pointer',
                        }}
                      >
                        {assignMutation.isPending
                          ? t('common.loading')
                          : t('issues.assignIssue')}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </DashboardLayout>
  )
}
