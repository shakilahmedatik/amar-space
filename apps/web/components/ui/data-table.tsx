'use client'

import { type ReactNode, useCallback } from 'react'
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
  totalItems: number
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
    ? Math.ceil(pagination.totalItems / pagination.pageSize)
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
              {filter.type === 'select' ? (
                <select
                  id={`filter-${filter.key}`}
                  value={filterValues[filter.key] || ''}
                  onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
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
              )}
            </div>
          ))}
        </div>
      )}

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
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    backgroundColor: '#f9fafb',
                    width: col.width,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6b7280',
                  }}
                >
                  {t('common.loading')}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6b7280',
                  }}
                >
                  {emptyMessage || 'No data found'}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={getRowKey(row)}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '0.75rem 1rem',
                        verticalAlign: 'middle',
                      }}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
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
            {pagination.page} / {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handlePrevious}
              disabled={pagination.page <= 1}
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
                color: pagination.page <= 1 ? '#9ca3af' : 'var(--foreground)',
                cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                opacity: pagination.page <= 1 ? 0.5 : 1,
              }}
            >
              {t('common.previous')}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={pagination.page >= totalPages}
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
                color:
                  pagination.page >= totalPages
                    ? '#9ca3af'
                    : 'var(--foreground)',
                cursor:
                  pagination.page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: pagination.page >= totalPages ? 0.5 : 1,
              }}
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
