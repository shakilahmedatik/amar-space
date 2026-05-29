'use client'

import Link from 'next/link'
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
          <Link
            href={`/bills/${row.billId}`}
            className="text-brand-blue-deep underline"
          >
            {t('bills.title')}
          </Link>
        ) : (
          <span className="text-muted">—</span>
        ),
      width: '120px',
    },
    {
      key: 'note',
      header: t('deposits.note'),
      render: (row) => (
        <span
          className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap inline-block"
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
      <div className="p-4 text-error-text text-sm">
        {t('deposits.loadError')}
      </div>
    )
  }

  return (
    <div className="p-6 rounded-lg border border-hairline bg-canvas mb-6">
      <h2 className="text-lg font-semibold text-ink-strong mb-4 pb-2 border-b border-hairline">
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
            data
              ? {
                  page: data.page,
                  pageSize: data.pageSize,
                  total: data.total,
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
