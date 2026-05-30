'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useRenterDashboard } from '@/hooks/use-dashboard'
import { useTranslation } from '@/lib/i18n'

/**
 * Renter Dashboard Component
 * Shows: flat address, building name, current bill with status, deposit balance (BDT),
 * active maintenance requests.
 * Handles no-flat-assigned state.
 * Validates: Requirements 20.3, 20.4, 20.7, 20.8
 */
export function RenterDashboard() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useRenterDashboard()

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError || !data) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-error-text/30 bg-error-bg p-6 text-center"
      >
        <p className="mb-4 text-error-text">{t('dashboard.loadError')}</p>
        <Button
          type="button"
          onClick={() => refetch()}
          className="min-h-[44px] rounded-full"
        >
          {t('dashboard.retry')}
        </Button>
      </div>
    )
  }

  // Handle no-flat-assigned state (Requirement 20.8)
  if (!data.flat) {
    return (
      <div className="rounded-xl border border-warning-text/30 bg-warning-bg p-8 text-center">
        <div className="mb-4 text-4xl" aria-hidden="true">
          🏠
        </div>
        <h2 className="mb-2 text-lg font-semibold text-warning-text">
          {t('dashboard.noFlatAssigned')}
        </h2>
        <p className="text-sm text-warning-text/80">
          {t('dashboard.noFlatAssignedDescription')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Flat Info Card */}
      <Card className="bg-canvas border-hairline rounded-xl border">
        <CardContent className="p-5">
          <h2 className="mb-3 text-lg font-semibold text-ink">
            {t('dashboard.myFlat')}
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-sm text-steel">
                {t('dashboard.buildingName')}
              </span>
              <span className="font-medium text-ink">
                {data.flat.buildingName}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-sm text-steel">
                {t('dashboard.flatAddress')}
              </span>
              <span className="font-medium text-ink">
                {t('flats.flatNumber')}: {data.flat.flatNumber},{' '}
                {t('flats.floor')}: {data.flat.floor}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-sm text-steel">
                {t('buildings.address')}
              </span>
              <span className="font-medium text-ink">
                {data.flat.buildingAddress}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Bill & Deposit */}
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
        {/* Current Bill */}
        <Card className="bg-canvas border-hairline rounded-xl border">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm text-steel">
              {t('dashboard.currentBill')}
            </h3>
            {data.currentBill ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <CurrencyDisplay
                    amount={data.currentBill.totalAmount}
                    large
                  />
                  <StatusBadge status={data.currentBill.status} />
                </div>
                <p className="text-xs text-muted">
                  {t('dashboard.billingMonth')}: {data.currentBill.billingMonth}
                </p>
                {data.currentBill.paidAmount > 0 && (
                  <p className="text-xs text-steel">
                    {t('bills.paidAmount')}:{' '}
                    <CurrencyDisplay amount={data.currentBill.paidAmount} />
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-steel">
                {t('dashboard.noBillThisMonth')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Deposit Balance */}
        <Card className="bg-canvas border-hairline rounded-xl border">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm text-steel">
              {t('dashboard.depositBalance')}
            </h3>
            <CurrencyDisplay amount={data.depositBalance} large />
          </CardContent>
        </Card>
      </div>

      {/* Active Maintenance Requests */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">
          {t('dashboard.activeMaintenanceRequests')}
        </h2>
        {data.activeMaintenanceRequests.length === 0 ? (
          <p className="text-sm text-steel">{t('maintenance.noRequests')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.activeMaintenanceRequests.map((req) => (
              <Card
                key={req.id}
                className="bg-canvas border-hairline rounded-lg border"
              >
                <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-[150px] flex-1">
                    <p className="mb-1 font-medium text-ink">{req.title}</p>
                    <p className="text-xs text-steel">
                      {new Date(req.createdAt).toLocaleDateString('bn-BD')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={req.priority} />
                    <StatusBadge status={req.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// --- Loading Skeleton ---

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-canvas border-hairline rounded-xl border">
        <CardContent className="p-5">
          <LoadingSkeleton rows={3} rowHeight={16} showHeader />
        </CardContent>
      </Card>
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
        {['bill-card', 'deposit-card'].map((id) => (
          <Card
            key={id}
            className="bg-canvas border-hairline rounded-xl border"
          >
            <CardContent className="p-5">
              <LoadingSkeleton rows={2} rowHeight={16} showHeader={false} />
            </CardContent>
          </Card>
        ))}
      </div>
      <LoadingSkeleton rows={4} showHeader />
    </div>
  )
}
