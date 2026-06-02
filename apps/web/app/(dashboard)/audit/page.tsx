'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { DataTableFilter } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSession } from '@/contexts/session-context'
import { useAuditLogs } from '@/hooks/use-audit'
import type { AuditLogEntry } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Audit log viewer page — /audit
 * Displays paginated audit logs with filters and expandable rows.
 * Owner-only access.
 */
export default function AuditPage() {
  const { role } = useSession()
  const { t } = useTranslation()
  const _router = useRouter()
  const [page, setPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Filter state
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [entityIdFilter, setEntityIdFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
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
  // Owner-only access guard
  if (role !== 'owner') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
        <h1 className="text-2xl font-bold text-error-text mb-3">
          {t('audit.forbidden')}
        </h1>
        <p className="text-base text-steel">{t('audit.forbiddenMessage')}</p>
      </div>
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

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1

  const entries = data?.data ?? []

  return (
    <>
      {isError && (
        <ErrorFeedback
          message={error?.message || t('audit.loadError')}
          type="error"
          visible
        />
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-ink">{t('audit.title')}</h1>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-lg border border-hairline">
            {filters.map((filter) => (
              <div key={filter.key} className="min-w-[150px] flex-1">
                <label
                  htmlFor={`filter-${filter.key}`}
                  className="block text-xs font-medium text-steel mb-1"
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
                  className="w-full px-3 py-2 text-sm rounded-md border border-hairline bg-canvas text-ink min-h-[44px]"
                />
              </div>
            ))}
          </div>

          {/* Table with expandable rows */}
          <div className="overflow-x-auto rounded-lg border border-hairline">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface min-h-section-sm">
                  <TableHead className="w-[50px] text-steel font-semibold text-xs">
                    {''}
                  </TableHead>
                  <TableHead className="text-steel font-semibold text-xs uppercase tracking-wide">
                    {t('audit.action')}
                  </TableHead>
                  <TableHead className="w-[130px] text-steel font-semibold text-xs uppercase tracking-wide">
                    {t('audit.entityType')}
                  </TableHead>
                  <TableHead className="w-[130px] text-steel font-semibold text-xs uppercase tracking-wide">
                    {t('audit.entityId')}
                  </TableHead>
                  <TableHead className="w-[140px] text-steel font-semibold text-xs uppercase tracking-wide">
                    {t('audit.actor')}
                  </TableHead>
                  <TableHead className="w-[160px] text-steel font-semibold text-xs uppercase tracking-wide">
                    {t('audit.timestamp')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow className="bg-canvas min-h-section-sm">
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-steel"
                    >
                      {t('audit.noLogs')}
                    </TableCell>
                  </TableRow>
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
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-steel">
              <span>
                {data.page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full min-w-[44px] min-h-[44px]"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label={t('common.previous')}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full min-w-[44px] min-h-[44px]"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label={t('common.next')}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
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
      <TableRow className="bg-canvas text-ink border-b border-hairline-soft min-h-section-sm">
        <TableCell className="align-middle py-3 px-2">
          <button
            type="button"
            onClick={() => onToggle(entry.id)}
            aria-label={
              isExpanded ? t('audit.collapseRow') : t('audit.expandRow')
            }
            aria-expanded={isExpanded}
            className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-center bg-transparent border-none cursor-pointer text-base text-steel transition-transform duration-150 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
          >
            ▶
          </button>
        </TableCell>
        <TableCell className="align-middle py-3 px-4">
          <span className="font-medium text-ink-strong">{entry.action}</span>
        </TableCell>
        <TableCell className="align-middle py-3 px-4">
          <span className="capitalize">{entry.entityType}</span>
        </TableCell>
        <TableCell className="align-middle py-3 px-4">
          <span className="text-xs font-mono text-steel" title={entry.entityId}>
            {entry.entityId.length > 12
              ? `${entry.entityId.slice(0, 12)}...`
              : entry.entityId}
          </span>
        </TableCell>
        <TableCell className="align-middle py-3 px-4">
          <span>{entry.actorName}</span>
        </TableCell>
        <TableCell className="align-middle py-3 px-4">
          <span className="text-[0.8rem] text-steel">
            {new Date(entry.createdAt).toLocaleString()}
          </span>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="border-b border-hairline-soft">
          <TableCell colSpan={6} className="p-4 bg-surface">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-[0.8125rem] font-semibold text-charcoal mb-2">
                  {t('audit.oldValues')}
                </h4>
                {entry.oldValues && Object.keys(entry.oldValues).length > 0 ? (
                  <pre className="text-xs bg-canvas p-3 rounded-md border border-hairline overflow-auto max-h-[200px] whitespace-pre-wrap wrap-break-word m-0">
                    {JSON.stringify(entry.oldValues, null, 2)}
                  </pre>
                ) : (
                  <p className="text-[0.8125rem] text-muted italic m-0">
                    {t('audit.noChanges')}
                  </p>
                )}
              </div>
              <div>
                <h4 className="text-[0.8125rem] font-semibold text-charcoal mb-2">
                  {t('audit.newValues')}
                </h4>
                {entry.newValues && Object.keys(entry.newValues).length > 0 ? (
                  <pre className="text-xs bg-canvas p-3 rounded-md border border-hairline overflow-auto max-h-[200px] whitespace-pre-wrap wrap-break-word m-0">
                    {JSON.stringify(entry.newValues, null, 2)}
                  </pre>
                ) : (
                  <p className="text-[0.8125rem] text-muted italic m-0">
                    {t('audit.noChanges')}
                  </p>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
