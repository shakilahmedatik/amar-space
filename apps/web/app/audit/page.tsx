'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import type { DataTableFilter } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useAuditLogs } from '@/hooks/use-audit'
import type { AuditLogEntry } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Audit log viewer page — /audit
 * Displays paginated audit logs with filters and expandable rows.
 * Owner-only access.
 * Validates: Requirements 13.3, 13.4, 13.5
 */
export default function AuditPage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [page, setPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Filter state
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [entityIdFilter, setEntityIdFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')

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

  const { data, isLoading, isError, error } = useAuditLogs({
    page,
    pageSize: 100,
    entityType: entityTypeFilter || undefined,
    entityId: entityIdFilter || undefined,
    actorId: actorFilter || undefined,
    action: actionFilter || undefined,
    startDate: startDateFilter || undefined,
    endDate: endDateFilter || undefined,
  })

  const handleFilterChange = useCallback((key: string, value: string) => {
    setPage(1)
    switch (key) {
      case 'entityType':
        setEntityTypeFilter(value)
        break
      case 'entityId':
        setEntityIdFilter(value)
        break
      case 'actor':
        setActorFilter(value)
        break
      case 'action':
        setActionFilter(value)
        break
      case 'startDate':
        setStartDateFilter(value)
        break
      case 'endDate':
        setEndDateFilter(value)
        break
    }
  }, [])

  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

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

  // Owner-only access guard
  if (role !== 'owner') {
    return (
      <DashboardLayout role={role} activePath="/audit">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            textAlign: 'center',
            padding: '2rem',
          }}
        >
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#dc2626',
              marginBottom: '0.75rem',
            }}
          >
            {t('audit.forbidden')}
          </h1>
          <p style={{ fontSize: '1rem', color: '#6b7280' }}>
            {t('audit.forbiddenMessage')}
          </p>
        </div>
      </DashboardLayout>
    )
  }

  const filters: DataTableFilter[] = [
    {
      key: 'entityType',
      label: t('audit.entityType'),
      type: 'text',
      placeholder: t('audit.entityTypePlaceholder'),
    },
    {
      key: 'entityId',
      label: t('audit.entityId'),
      type: 'text',
      placeholder: t('audit.entityIdPlaceholder'),
    },
    {
      key: 'actor',
      label: t('audit.actor'),
      type: 'text',
      placeholder: t('audit.actorPlaceholder'),
    },
    {
      key: 'action',
      label: t('audit.action'),
      type: 'text',
      placeholder: t('audit.actionPlaceholder'),
    },
    {
      key: 'startDate',
      label: t('audit.startDate'),
      type: 'text',
      placeholder: 'YYYY-MM-DD',
    },
    {
      key: 'endDate',
      label: t('audit.endDate'),
      type: 'text',
      placeholder: 'YYYY-MM-DD',
    },
  ]

  const filterValues: Record<string, string> = {
    entityType: entityTypeFilter,
    entityId: entityIdFilter,
    actor: actorFilter,
    action: actionFilter,
    startDate: startDateFilter,
    endDate: endDateFilter,
  }

  const totalPages = data?.pagination
    ? Math.ceil(data.pagination.totalItems / data.pagination.pageSize)
    : 1

  const entries = data?.data ?? []

  return (
    <DashboardLayout role={role} activePath="/audit">
      {isError && (
        <ErrorFeedback
          message={error?.message || t('audit.loadError')}
          type="error"
          visible
        />
      )}

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
          {t('audit.title')}
        </h1>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <>
          {/* Filters */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1rem',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
            }}
          >
            {filters.map((filter) => (
              <div
                key={filter.key}
                style={{ minWidth: '150px', flex: '1 1 auto' }}
              >
                <label
                  htmlFor={`filter-${filter.key}`}
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  {filter.label}
                </label>
                <input
                  id={`filter-${filter.key}`}
                  type="text"
                  value={filterValues[filter.key] || ''}
                  onChange={(e) =>
                    handleFilterChange(filter.key, e.target.value)
                  }
                  placeholder={filter.placeholder}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    minHeight: '44px',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Table with expandable rows */}
          <div
            style={{
              overflowX: 'auto',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th
                    style={{
                      padding: '0.75rem 0.5rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      backgroundColor: '#f9fafb',
                      width: '50px',
                    }}
                  >
                    {''}
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    {t('audit.action')}
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      backgroundColor: '#f9fafb',
                      width: '130px',
                    }}
                  >
                    {t('audit.entityType')}
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      backgroundColor: '#f9fafb',
                      width: '130px',
                    }}
                  >
                    {t('audit.entityId')}
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      backgroundColor: '#f9fafb',
                      width: '140px',
                    }}
                  >
                    {t('audit.actor')}
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      backgroundColor: '#f9fafb',
                      width: '160px',
                    }}
                  >
                    {t('audit.timestamp')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#6b7280',
                      }}
                    >
                      {t('audit.noLogs')}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <AuditRow
                      key={entry.id}
                      entry={entry}
                      isExpanded={expandedRows.has(entry.id)}
                      onToggle={toggleRow}
                      t={t}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.pagination && totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1rem',
                fontSize: '0.875rem',
                color: '#6b7280',
              }}
            >
              <span>
                {data.pagination.page} / {totalPages}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label={t('common.previous')}
                  style={{
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'transparent',
                    color: page <= 1 ? '#9ca3af' : 'var(--foreground)',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    opacity: page <= 1 ? 0.5 : 1,
                  }}
                >
                  {t('common.previous')}
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label={t('common.next')}
                  style={{
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'transparent',
                    color: page >= totalPages ? '#9ca3af' : 'var(--foreground)',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: page >= totalPages ? 0.5 : 1,
                  }}
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}

/**
 * Individual audit row with expandable old/new values.
 */
function AuditRow({
  entry,
  isExpanded,
  onToggle,
  t,
}: {
  entry: AuditLogEntry
  isExpanded: boolean
  onToggle: (id: string) => void
  t: (key: string) => string
}) {
  return (
    <>
      <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
        <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'middle' }}>
          <button
            type="button"
            onClick={() => onToggle(entry.id)}
            aria-label={
              isExpanded ? t('audit.collapseRow') : t('audit.expandRow')
            }
            aria-expanded={isExpanded}
            style={{
              minWidth: '44px',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              color: '#6b7280',
              transition: 'transform 0.15s ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ▶
          </button>
        </td>
        <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
          <span style={{ fontWeight: 500, color: '#111827' }}>
            {entry.action}
          </span>
        </td>
        <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
          <span style={{ textTransform: 'capitalize' }}>
            {entry.entityType}
          </span>
        </td>
        <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              color: '#6b7280',
            }}
            title={entry.entityId}
          >
            {entry.entityId.length > 12
              ? `${entry.entityId.slice(0, 12)}...`
              : entry.entityId}
          </span>
        </td>
        <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
          <span>{entry.actorName}</span>
        </td>
        <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            {new Date(entry.createdAt).toLocaleString()}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
          <td
            colSpan={6}
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#f9fafb',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
              }}
            >
              <div>
                <h4
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '0.5rem',
                  }}
                >
                  {t('audit.oldValues')}
                </h4>
                {entry.oldValues && Object.keys(entry.oldValues).length > 0 ? (
                  <pre
                    style={{
                      fontSize: '0.75rem',
                      backgroundColor: '#fff',
                      padding: '0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #e5e7eb',
                      overflow: 'auto',
                      maxHeight: '200px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(entry.oldValues, null, 2)}
                  </pre>
                ) : (
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: '#9ca3af',
                      fontStyle: 'italic',
                      margin: 0,
                    }}
                  >
                    {t('audit.noChanges')}
                  </p>
                )}
              </div>
              <div>
                <h4
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '0.5rem',
                  }}
                >
                  {t('audit.newValues')}
                </h4>
                {entry.newValues && Object.keys(entry.newValues).length > 0 ? (
                  <pre
                    style={{
                      fontSize: '0.75rem',
                      backgroundColor: '#fff',
                      padding: '0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #e5e7eb',
                      overflow: 'auto',
                      maxHeight: '200px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(entry.newValues, null, 2)}
                  </pre>
                ) : (
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: '#9ca3af',
                      fontStyle: 'italic',
                      margin: 0,
                    }}
                  >
                    {t('audit.noChanges')}
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
