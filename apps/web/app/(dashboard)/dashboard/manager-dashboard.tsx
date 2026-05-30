'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useManagerDashboard } from '@/hooks/use-dashboard'
import { useTranslation } from '@/lib/i18n'

/**
 * Manager Dashboard Component
 * Shows: assigned buildings, flats with occupancy (max 20), unpaid bills (BDT),
 * 10 pending maintenance requests.
 * Validates: Requirements 20.2, 20.4, 20.7
 */
export function ManagerDashboard() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useManagerDashboard()

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError || !data) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-error-text bg-error-bg p-6 text-center"
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

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        <StatCard
          label={t('dashboard.assignedBuildings')}
          value={String(data.assignedBuildings.length)}
        />
        <StatCard
          label={t('dashboard.unpaidBills')}
          value={<CurrencyDisplay amount={data.unpaidBillsTotal} large />}
        />
      </div>

      {/* Assigned Buildings */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-charcoal">
          {t('dashboard.assignedBuildings')}
        </h2>
        {data.assignedBuildings.length === 0 ? (
          <p className="text-sm text-steel">{t('buildings.noBuildings')}</p>
        ) : (
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
            {data.assignedBuildings.map((building) => (
              <Card key={building.id} className="bg-canvas">
                <CardContent className="p-4">
                  <p className="font-semibold text-ink">{building.name}</p>
                  <p className="mt-1 text-sm text-steel">{building.address}</p>
                  <p className="mt-1 text-xs text-muted">
                    {t('dashboard.totalFlats')}: {building.totalFlats}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Flats with Occupancy (max 20) */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-charcoal">
          {t('dashboard.flatsOccupancy')}
        </h2>
        {data.flats.length === 0 ? (
          <p className="text-sm text-steel">{t('flats.noFlats')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.flats.slice(0, 20).map((flat) => (
              <Card key={flat.id} className="bg-canvas">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-[150px] flex-1">
                    <p className="font-medium text-ink">
                      {t('flats.flatNumber')}: {flat.flatNumber}
                    </p>
                    <p className="text-xs text-steel">
                      {flat.buildingName} • {t('flats.floor')}: {flat.floor}
                    </p>
                  </div>
                  <StatusBadge status={flat.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Pending Maintenance (10 most recent) */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-charcoal">
          {t('dashboard.pendingMaintenance')}
        </h2>
        {data.pendingMaintenance.length === 0 ? (
          <p className="text-sm text-steel">{t('maintenance.noRequests')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.pendingMaintenance.map((req) => (
              <Card key={req.id} className="bg-canvas">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-[150px] flex-1">
                    <p className="mb-1 font-medium text-ink">{req.title}</p>
                    <p className="text-xs text-steel">
                      {req.buildingName && `${req.buildingName} • `}
                      {req.flatNumber &&
                        `${t('flats.flatNumber')}: ${req.flatNumber}`}
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

// --- Stat Card ---

interface StatCardProps {
  label: string
  value: React.ReactNode
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <Card className="bg-surface shadow-sm">
      <CardContent className="p-5">
        <p className="mb-2 text-sm text-steel">{label}</p>
        <div className="text-2xl font-bold text-ink">{value}</div>
      </CardContent>
    </Card>
  )
}

// --- Loading Skeleton ---

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {['assigned', 'unpaid'].map((id) => (
          <Card key={id} className="bg-canvas">
            <CardContent className="p-5">
              <LoadingSkeleton rows={2} rowHeight={16} showHeader={false} />
            </CardContent>
          </Card>
        ))}
      </div>
      <LoadingSkeleton rows={4} showHeader />
      <LoadingSkeleton rows={5} showHeader />
      <LoadingSkeleton rows={5} showHeader />
    </div>
  )
}
