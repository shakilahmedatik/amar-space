'use client'

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
        style={{
          padding: '1.5rem',
          backgroundColor: '#fef2f2',
          borderRadius: '0.5rem',
          border: '1px solid #fecaca',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#991b1b', marginBottom: '1rem' }}>
          {t('dashboard.loadError')}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          style={{
            minHeight: '44px',
            padding: '0.5rem 1.5rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('dashboard.retry')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
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
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: '#374151',
          }}
        >
          {t('dashboard.assignedBuildings')}
        </h2>
        {data.assignedBuildings.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {t('buildings.noBuildings')}
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {data.assignedBuildings.map((building) => (
              <div
                key={building.id}
                style={{
                  padding: '1rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                }}
              >
                <p style={{ fontWeight: 600, color: '#111827' }}>
                  {building.name}
                </p>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginTop: '0.25rem',
                  }}
                >
                  {building.address}
                </p>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    marginTop: '0.25rem',
                  }}
                >
                  {t('dashboard.totalFlats')}: {building.totalFlats}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Flats with Occupancy (max 20) */}
      <section>
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: '#374151',
          }}
        >
          {t('dashboard.flatsOccupancy')}
        </h2>
        {data.flats.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {t('flats.noFlats')}
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {data.flats.slice(0, 20).map((flat) => (
              <div
                key={flat.id}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <p style={{ fontWeight: 500, color: '#111827' }}>
                    {t('flats.flatNumber')}: {flat.flatNumber}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {flat.buildingName} • {t('flats.floor')}: {flat.floor}
                  </p>
                </div>
                <StatusBadge status={flat.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Maintenance (10 most recent) */}
      <section>
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: '#374151',
          }}
        >
          {t('dashboard.pendingMaintenance')}
        </h2>
        {data.pendingMaintenance.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {t('maintenance.noRequests')}
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {data.pendingMaintenance.map((req) => (
              <div
                key={req.id}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <p
                    style={{
                      fontWeight: 500,
                      color: '#111827',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {req.title}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {req.buildingName && `${req.buildingName} • `}
                    {req.flatNumber &&
                      `${t('flats.flatNumber')}: ${req.flatNumber}`}
                  </p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <StatusBadge status={req.priority} />
                  <StatusBadge status={req.status} />
                </div>
              </div>
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
    <div
      style={{
        padding: '1.25rem',
        backgroundColor: '#ffffff',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <p
        style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          marginBottom: '0.5rem',
        }}
      >
        {label}
      </p>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
        {value}
      </div>
    </div>
  )
}

// --- Loading Skeleton ---

function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {['assigned', 'unpaid'].map((id) => (
          <div
            key={id}
            style={{
              padding: '1.25rem',
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
            }}
          >
            <LoadingSkeleton rows={2} rowHeight={16} showHeader={false} />
          </div>
        ))}
      </div>
      <LoadingSkeleton rows={4} showHeader />
      <LoadingSkeleton rows={5} showHeader />
      <LoadingSkeleton rows={5} showHeader />
    </div>
  )
}
