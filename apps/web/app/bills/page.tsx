'use client'

import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  useBills,
  useFlatOptions,
  useGenerateBills,
  useRenterOptions,
} from '@/hooks/use-bills'
import { useBuildings } from '@/hooks/use-buildings'
import type { BillListItem, BillStatus } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Bill list page — /bills
 * Displays paginated list of bills with multi-field filters.
 * Owner/Manager can generate bills.
 * Validates: Requirements 7.1, 7.6, 7.7, 7.8, 7.11
 */
export default function BillsPage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [page, setPage] = useState(1)

  // Filter state
  const [buildingFilter, setBuildingFilter] = useState('')
  const [flatFilter, setFlatFilter] = useState('')
  const [renterFilter, setRenterFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<BillStatus | ''>('')

  // Generate bills dialog state
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [generateMonth, setGenerateMonth] = useState('')
  const [generateError, setGenerateError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

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

  const { data, isLoading, isError, error } = useBills({
    page,
    pageSize: 50,
    buildingId: buildingFilter || undefined,
    flatId: flatFilter || undefined,
    renterId: renterFilter || undefined,
    month: monthFilter || undefined,
    status: statusFilter || undefined,
  })

  const { data: buildingsData } = useBuildings(1, 100)
  const { data: flatOptionsData } = useFlatOptions()
  const { data: renterOptionsData } = useRenterOptions()
  const generateMutation = useGenerateBills()

  const handleFilterChange = useCallback((key: string, value: string) => {
    setPage(1)
    switch (key) {
      case 'building':
        setBuildingFilter(value)
        break
      case 'flat':
        setFlatFilter(value)
        break
      case 'renter':
        setRenterFilter(value)
        break
      case 'month':
        setMonthFilter(value)
        break
      case 'status':
        setStatusFilter(value as BillStatus | '')
        break
    }
  }, [])

  async function handleGenerateBills(e: FormEvent) {
    e.preventDefault()
    setGenerateError('')

    if (!generateMonth) {
      setGenerateError(t('bills.monthRequired'))
      return
    }

    try {
      const result = await generateMutation.mutateAsync({
        month: generateMonth,
      })
      setShowGenerateDialog(false)
      setGenerateMonth('')
      setSuccessMessage(
        `${t('bills.generateSuccess')} — ${t('bills.generated')}: ${result.generated}, ${t('bills.skipped')}: ${result.skipped}`,
      )
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : t('bills.generateError'),
      )
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
  const canGenerate = role === 'owner' || role === 'manager'

  const filters = [
    {
      key: 'building',
      label: t('bills.building'),
      type: 'select' as const,
      placeholder: t('bills.allBuildings'),
      options: (buildingsData?.data ?? []).map((b) => ({
        value: b.id,
        label: b.name,
      })),
    },
    {
      key: 'flat',
      label: t('bills.flat'),
      type: 'select' as const,
      placeholder: t('bills.allFlats'),
      options: (flatOptionsData?.data ?? []).map((f) => ({
        value: f.id,
        label: `${f.flatNumber}${f.buildingName ? ` — ${f.buildingName}` : ''}`,
      })),
    },
    {
      key: 'renter',
      label: t('bills.renter'),
      type: 'select' as const,
      placeholder: t('bills.allRenters'),
      options: (renterOptionsData?.data ?? []).map((r) => ({
        value: r.id,
        label: r.fullName,
      })),
    },
    {
      key: 'month',
      label: t('bills.billMonth'),
      type: 'text' as const,
      placeholder: 'YYYY-MM',
    },
    {
      key: 'status',
      label: t('bills.status'),
      type: 'select' as const,
      placeholder: t('bills.allStatuses'),
      options: [
        { value: 'unpaid', label: t('bills.unpaid') },
        { value: 'partially_paid', label: t('bills.partiallyPaid') },
        { value: 'paid', label: t('bills.paid') },
        { value: 'overdue', label: t('bills.overdue') },
      ],
    },
  ]

  const filterValues: Record<string, string> = {
    building: buildingFilter,
    flat: flatFilter,
    renter: renterFilter,
    month: monthFilter,
    status: statusFilter,
  }

  const columns: DataTableColumn<BillListItem>[] = [
    {
      key: 'billingMonth',
      header: t('bills.billMonth'),
      render: (row) => (
        <a
          href={`/bills/${row.id}`}
          style={{
            color: '#2563eb',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          {row.billingMonth}
        </a>
      ),
      width: '110px',
    },
    {
      key: 'renterName',
      header: t('bills.renter'),
      render: (row) => <span>{row.renterName}</span>,
    },
    {
      key: 'flatNumber',
      header: t('bills.flat'),
      render: (row) => <span>{row.flatNumber}</span>,
      width: '100px',
    },
    {
      key: 'buildingName',
      header: t('bills.building'),
      render: (row) => <span>{row.buildingName}</span>,
    },
    {
      key: 'totalAmount',
      header: t('bills.totalAmount'),
      render: (row) => <CurrencyDisplay amount={row.totalAmount} />,
      width: '140px',
    },
    {
      key: 'paidAmount',
      header: t('bills.paidAmount'),
      render: (row) => <CurrencyDisplay amount={row.paidAmount} />,
      width: '140px',
    },
    {
      key: 'status',
      header: t('bills.status'),
      render: (row) => <StatusBadge status={row.status} />,
      width: '150px',
    },
  ]

  return (
    <DashboardLayout role={role} activePath="/bills">
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
          message={error?.message || t('bills.loadError')}
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
          {t('bills.title')}
        </h1>

        {canGenerate && (
          <button
            type="button"
            onClick={() => setShowGenerateDialog(true)}
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
            {t('bills.generateBills')}
          </button>
        )}
      </div>

      {/* Generate Bills Dialog */}
      {showGenerateDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '24rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
              {t('bills.generateBills')}
            </h2>

            <form onSubmit={handleGenerateBills}>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="generate-month"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '0.375rem',
                  }}
                >
                  {t('bills.billMonth')}
                </label>
                <input
                  id="generate-month"
                  type="month"
                  value={generateMonth}
                  onChange={(e) => setGenerateMonth(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    minHeight: '44px',
                  }}
                />
                {generateError && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#dc2626',
                      marginTop: '0.25rem',
                    }}
                  >
                    {generateError}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowGenerateDialog(false)
                    setGenerateMonth('')
                    setGenerateError('')
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
                  disabled={generateMutation.isPending}
                  style={{
                    minWidth: '44px',
                    minHeight: '44px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    borderRadius: '0.375rem',
                    backgroundColor: generateMutation.isPending
                      ? '#93c5fd'
                      : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    cursor: generateMutation.isPending
                      ? 'not-allowed'
                      : 'pointer',
                  }}
                >
                  {generateMutation.isPending
                    ? t('common.loading')
                    : t('bills.generateBills')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <DataTable<BillListItem>
          columns={columns}
          data={data?.data ?? []}
          getRowKey={(row) => row.id}
          pagination={data?.pagination}
          onPageChange={setPage}
          filters={filters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          loading={isLoading}
          emptyMessage={t('bills.noBills')}
        />
      )}
    </DashboardLayout>
  )
}
