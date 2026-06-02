'use client'

import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { useSession } from '@/contexts/session-context'
import {
  useDeletePayment,
  usePayments,
  useRenterOptions,
} from '@/hooks/use-payments'
import type { Payment, PaymentMethod } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Payment history page — /payments
 * Displays paginated payment list with filters (bill, renter, date range, method).
 */
export default function PaymentsPage() {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)
  const deletePaymentMutation = useDeletePayment()
  const { role } = useSession()
  const { t } = useTranslation()
  const _router = useRouter()
  const [page, setPage] = useState(1)
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | ''>('')
  const [renterFilter, setRenterFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { data, isLoading, error } = usePayments({
    page,
    pageSize: 50,
    method: methodFilter || undefined,
    renterId: renterFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  const { data: renterData } = useRenterOptions()

  const handleFilterChange = useCallback((key: string, value: string) => {
    setPage(1)
    if (key === 'method') {
      setMethodFilter(value as PaymentMethod | '')
    } else if (key === 'renter') {
      setRenterFilter(value)
    } else if (key === 'startDate') {
      setStartDate(value)
    } else if (key === 'endDate') {
      setEndDate(value)
    }
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const canRecord = role === 'owner' || role === 'manager'

  const formatMethod = (method: PaymentMethod): string => {
    switch (method) {
      case 'cash':
        return t('payments.cash')
      case 'bank_transfer':
        return t('payments.bankTransfer')
      case 'mobile_banking':
        return t('payments.mobileBanking')
      default:
        return method
    }
  }

  const columns: DataTableColumn<Payment>[] = [
    {
      key: 'receiptReference',
      header: t('payments.receipt'),
      render: (row) => (
        <Link
          href={`/payments/${row.id}`}
          className="text-brand-blue-deep font-medium no-underline text-sm"
        >
          {row.receiptReference}
        </Link>
      ),
    },
    {
      key: 'amount',
      header: t('payments.amount'),
      render: (row) => (
        <span className="font-medium">
          ৳
          {Number(row.amount).toLocaleString('en-BD', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: 'paymentDate',
      header: t('payments.date'),
      render: (row) => <span>{row.paymentDate}</span>,
    },
    {
      key: 'paymentMethod',
      header: t('payments.method'),
      render: (row) => <span>{formatMethod(row.paymentMethod)}</span>,
    },
    {
      key: 'renterName',
      header: t('payments.renter'),
      render: (row) => <span>{row.renterName || '—'}</span>,
    },
    {
      key: 'billingMonth',
      header: t('payments.billMonth'),
      render: (row) => <span>{row.billingMonth || '—'}</span>,
    },
  ]

  if (role === 'owner' || role === 'manager') {
    columns.push({
      key: 'actions',
      header: t('flats.actions'),
      render: (row) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDeleteTargetId(row.id)}
            className="min-h-[44px] w-[44px] p-0 rounded-full text-error-text hover:bg-error-bg/10 hover:text-error-text"
            aria-label={t('payments.deletePayment')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      width: '60px',
    })
  }

  const filters: DataTableFilter[] = [
    {
      key: 'method',
      label: t('payments.method'),
      type: 'select',
      placeholder: t('payments.allMethods'),
      options: [
        { value: 'cash', label: t('payments.cash') },
        { value: 'bank_transfer', label: t('payments.bankTransfer') },
        { value: 'mobile_banking', label: t('payments.mobileBanking') },
      ],
    },
    {
      key: 'renter',
      label: t('payments.renter'),
      type: 'select' as const,
      placeholder: t('payments.allRenters'),
      options: (renterData?.data || []).map((r) => ({
        value: r.id,
        label: r.fullName,
      })),
    },
  ]

  return (
    <>
      {feedback && (
        <ErrorFeedback
          message={feedback.message}
          type={feedback.type}
          visible
          onDismiss={() => setFeedback(null)}
        />
      )}
      {error && (
        <ErrorFeedback
          message={error.message || t('common.error')}
          type="error"
          visible
        />
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-ink">{t('payments.title')}</h1>

        {canRecord && (
          <Button
            asChild
            className="rounded-full min-h-[44px] bg-primary text-on-primary font-semibold"
          >
            <Link href="/payments/new">{t('payments.recordPayment')}</Link>
          </Button>
        )}
      </div>

      {/* Date range filters */}
      <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-md border border-hairline">
        <div className="min-w-[150px] flex-1">
          <label
            htmlFor="filter-startDate"
            className="block text-xs font-medium text-steel mb-1"
          >
            {t('payments.startDate')}
          </label>
          <input
            id="filter-startDate"
            type="date"
            value={startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-hairline bg-canvas text-ink min-h-[44px]"
          />
        </div>
        <div className="min-w-[150px] flex-1">
          <label
            htmlFor="filter-endDate"
            className="block text-xs font-medium text-steel mb-1"
          >
            {t('payments.endDate')}
          </label>
          <input
            id="filter-endDate"
            type="date"
            value={endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-hairline bg-canvas text-ink min-h-[44px]"
          />
        </div>
      </div>

      <DataTable<Payment>
        columns={columns}
        data={data?.data || []}
        getRowKey={(row) => row.id}
        loading={isLoading}
        emptyMessage={t('payments.noPayments')}
        pagination={
          data
            ? { total: data.total, page: data.page, pageSize: data.pageSize }
            : undefined
        }
        onPageChange={handlePageChange}
        filters={filters}
        filterValues={{ method: methodFilter, renter: renterFilter }}
        onFilterChange={handleFilterChange}
      />

      <ConfirmDialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          if (!deleteTargetId) return
          try {
            await deletePaymentMutation.mutateAsync(deleteTargetId)
            setFeedback({
              message: t('payments.deleteSuccess'),
              type: 'success',
            })
          } catch (err) {
            setFeedback({
              message: err instanceof Error ? err.message : t('common.error'),
              type: 'error',
            })
          } finally {
            setDeleteTargetId(null)
          }
        }}
        title={t('payments.deleteConfirmTitle')}
        description={t('payments.deleteConfirmDescription')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={deletePaymentMutation.isPending}
      />
    </>
  )
}
