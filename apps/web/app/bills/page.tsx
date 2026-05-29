'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
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
  const router = useRouter()
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
          router.push('/login')
          return
        }
        setUser(session)
      } catch {
        router.push('/login')
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
      <div className="flex h-dvh items-center justify-center bg-surface">
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
        <Link
          href={`/bills/${row.id}`}
          className="text-brand-blue-deep font-medium no-underline hover:underline"
        >
          {row.billingMonth}
        </Link>
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

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-ink">{t('bills.title')}</h1>

        {canGenerate && (
          <Button
            type="button"
            onClick={() => setShowGenerateDialog(true)}
            className="min-h-[44px] rounded-full bg-primary text-on-primary font-semibold px-6"
          >
            {t('bills.generateBills')}
          </Button>
        )}
      </div>

      {/* Generate Bills Dialog */}
      {showGenerateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-canvas rounded-xl p-6 w-full max-w-sm shadow-lg">
            <h2 className="text-lg font-semibold text-ink mb-4">
              {t('bills.generateBills')}
            </h2>

            <form onSubmit={handleGenerateBills}>
              <div className="mb-4">
                <label
                  htmlFor="generate-month"
                  className="block text-sm font-medium text-charcoal mb-2"
                >
                  {t('bills.billMonth')}
                </label>
                <input
                  id="generate-month"
                  type="month"
                  value={generateMonth}
                  onChange={(e) => setGenerateMonth(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-hairline min-h-[44px] bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
                {generateError && (
                  <p className="text-xs text-error-text mt-1">
                    {generateError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowGenerateDialog(false)
                    setGenerateMonth('')
                    setGenerateError('')
                  }}
                  className="min-h-[44px] rounded-full border-hairline text-charcoal"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={generateMutation.isPending}
                  className="min-h-[44px] rounded-full bg-primary text-on-primary font-semibold disabled:opacity-50"
                >
                  {generateMutation.isPending
                    ? t('common.loading')
                    : t('bills.generateBills')}
                </Button>
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
          pagination={
            data
              ? { total: data.total, page: data.page, pageSize: data.pageSize }
              : undefined
          }
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
