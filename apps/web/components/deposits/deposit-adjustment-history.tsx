'use client'

import { useCallback, useState } from 'react'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { DateDisplay } from '@/components/ui/date-display'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useAdjustmentHistory } from '@/hooks/use-deposits'
import type { AdvanceAdjustment } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

interface DepositAdjustmentHistoryProps {
  contractId: string
}

/**
 * Adjustment history list, paginated (max 50 per page), sorted by creation timestamp descending.
 * Validates: Requirements 9.11
 */
export function DepositAdjustmentHistory({
  contractId,
}: DepositAdjustmentHistoryProps) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const pageSize = 50

  const { data, isLoading, isError } = useAdjustmentHistory(
    contractId,
    page,
    pageSize,
  )

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const columns: DataTableColumn<AdvanceAdjustment>[] = [
    {
      key: 'createdAt',
      header: t('deposits.adjustedAt'),
      render: (row) => <DateDisplay date={row.createdAt} />,
      width: '140px',
    },
    {
      key: 'amount',
      header: t('deposits.amount'),
      render: (row) => <CurrencyDisplay amount={row.amount} />,
      width: '140px',
    },
    {
      key: 'billId',
      header: t('deposits.billLink'),
      render: (row) =>
        row.billId ? (
          <a
            href={`/bills/${row.billId}`}
            style={{ color: '#2563eb', textDecoration: 'underline' }}
          >
            {t('bills.title')}
          </a>
        ) : (
          <span style={{ color: '#9ca3af' }}>—</span>
        ),
      width: '120px',
    },
    {
      key: 'note',
      header: t('deposits.note'),
      render: (row) => (
        <span
          style={{
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
          title={row.note || ''}
        >
          {row.note || '—'}
        </span>
      ),
    },
    {
      key: 'adjustedByName',
      header: t('deposits.adjustedBy'),
      render: (row) => <span>{row.adjustedByName}</span>,
      width: '140px',
    },
  ]

  if (isError) {
    return (
      <div
        style={{
          padding: '1rem',
          color: '#dc2626',
          fontSize: '0.875rem',
        }}
      >
        {t('deposits.loadError')}
      </div>
    )
  }

  return (
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
          paddingBottom: '0.5rem',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {t('deposits.adjustmentHistory')}
      </h2>

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <DataTable<AdvanceAdjustment>
          columns={columns}
          data={data?.data || []}
          getRowKey={(row) => row.id}
          pagination={
            data?.pagination
              ? {
                  page: data.pagination.page,
                  pageSize: data.pagination.pageSize,
                  totalItems: data.pagination.totalItems,
                }
              : undefined
          }
          onPageChange={handlePageChange}
          loading={isLoading}
          emptyMessage={t('deposits.noAdjustments')}
        />
      )}
    </div>
  )
}
