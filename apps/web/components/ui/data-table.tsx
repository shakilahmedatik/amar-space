'use client'

import { type ReactNode, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslation } from '@/lib/i18n'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  width?: string
}

export interface DataTableFilter {
  key: string
  label: string
  type: 'text' | 'select'
  options?: { value: string; label: string }[]
  placeholder?: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowKey: (row: T) => string
  pagination?: PaginationInfo
  onPageChange?: (page: number) => void
  filters?: DataTableFilter[]
  filterValues?: Record<string, string>
  onFilterChange?: (key: string, value: string) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
}

/**
 * Generic paginated data table with filter support.
 * Validates: Requirement 16.1
 */
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  pagination,
  onPageChange,
  filters,
  filterValues = {},
  onFilterChange,
  loading = false,
  emptyMessage,
  className = '',
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1

  const handlePrevious = useCallback(() => {
    if (pagination && pagination.page > 1) onPageChange?.(pagination.page - 1)
  }, [pagination, onPageChange])

  const handleNext = useCallback(() => {
    if (pagination && pagination.page < totalPages)
      onPageChange?.(pagination.page + 1)
  }, [pagination, totalPages, onPageChange])

  return (
    <div className={className}>
      {filters && filters.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-lg border border-hairline">
          {filters.map((filter) => (
            <div key={filter.key} className="min-w-[150px] flex-1">
              <label
                htmlFor={`filter-${filter.key}`}
                className="block text-xs font-medium text-steel mb-1"
              >
                {filter.label}
              </label>
              {filter.type === 'select' ? (
                <select
                  id={`filter-${filter.key}`}
                  value={filterValues[filter.key] || ''}
                  onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-hairline bg-canvas text-ink min-h-[44px]"
                >
                  <option value="">
                    {filter.placeholder || t('common.filter')}
                  </option>
                  {filter.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`filter-${filter.key}`}
                  type="text"
                  value={filterValues[filter.key] || ''}
                  onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                  placeholder={filter.placeholder || t('common.search')}
                  className="w-full px-3 py-2 text-sm rounded-md border border-hairline bg-canvas text-ink min-h-[44px]"
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-hairline overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface min-h-section-sm">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className="text-steel font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="bg-canvas min-h-section-sm">
                <TableCell
                  colSpan={columns.length}
                  className="py-8 text-center text-steel"
                >
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow className="bg-canvas min-h-section-sm">
                <TableCell
                  colSpan={columns.length}
                  className="py-8 text-center text-steel"
                >
                  {emptyMessage || 'No data found'}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={getRowKey(row)}
                  className="bg-canvas text-ink min-h-section-sm"
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className="align-middle">
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-steel">
          <span>
            {pagination.page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={pagination.page <= 1}
              aria-label={t('common.previous')}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md border border-hairline bg-transparent text-ink disabled:text-stone disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('common.previous')}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={pagination.page >= totalPages}
              aria-label={t('common.next')}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md border border-hairline bg-transparent text-ink disabled:text-stone disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
