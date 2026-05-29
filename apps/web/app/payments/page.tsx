'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { usePayments, useRenterOptions } from '@/hooks/use-payments'
import type { Payment, PaymentMethod } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Payment history page — /payments
 * Displays paginated payment list with filters (bill, renter, date range, method).
 * Validates: Requirements 8.5, 8.6, 8.9
 */
export default function PaymentsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [role, setRole] = useState<UserRole>('owner')
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [page, setPage] = useState(1)
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | ''>('')
  const [renterFilter, setRenterFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          router.push('/login')
          return
        }
        setRole(session.role as UserRole)
      } catch {
        router.push('/login')
      } finally {
        setIsLoadingSession(false)
      }
    }
    loadSession()
  }, [])

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

  if (isLoadingSession) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <div className="w-full max-w-md px-4">
          <LoadingSkeleton rows={5} showHeader />
        </div>
      </div>
    )
  }

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
    ...(role !== 'renter'
      ? [
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
      : []),
  ]

  return (
    <DashboardLayout role={role} activePath="/payments">
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
    </DashboardLayout>
  )
}
