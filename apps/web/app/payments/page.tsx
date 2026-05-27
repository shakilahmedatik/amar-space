'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
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
          window.location.href = '/login'
          return
        }
        setRole(session.role as UserRole)
      } catch {
        window.location.href = '/login'
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
      <div className="flex h-dvh items-center justify-center bg-gray-50">
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
        <a
          href={`/payments/${row.id}`}
          style={{
            color: '#2563eb',
            fontWeight: 500,
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          {row.receiptReference}
        </a>
      ),
    },
    {
      key: 'amount',
      header: t('payments.amount'),
      render: (row) => (
        <span style={{ fontWeight: 500 }}>
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
          {t('payments.title')}
        </h1>

        {canRecord && (
          <a
            href="/payments/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: '0.5rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              textDecoration: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('payments.recordPayment')}
          </a>
        )}
      </div>

      {/* Date range filters */}
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
        <div style={{ minWidth: '150px', flex: '1 1 auto' }}>
          <label
            htmlFor="filter-startDate"
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#6b7280',
              marginBottom: '0.25rem',
            }}
          >
            {t('payments.startDate')}
          </label>
          <input
            id="filter-startDate"
            type="date"
            value={startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
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
        <div style={{ minWidth: '150px', flex: '1 1 auto' }}>
          <label
            htmlFor="filter-endDate"
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#6b7280',
              marginBottom: '0.25rem',
            }}
          >
            {t('payments.endDate')}
          </label>
          <input
            id="filter-endDate"
            type="date"
            value={endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
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
      </div>

      <DataTable<Payment>
        columns={columns}
        data={data?.data || []}
        getRowKey={(row) => row.id}
        loading={isLoading}
        emptyMessage={t('payments.noPayments')}
        pagination={data?.pagination}
        onPageChange={handlePageChange}
        filters={filters}
        filterValues={{ method: methodFilter, renter: renterFilter }}
        onFilterChange={handleFilterChange}
      />
    </DashboardLayout>
  )
}
