'use client'

import { CurrencyDisplay } from '@/components/ui/currency-display'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useOwnerDashboard } from '@/hooks/use-dashboard'
import { useTranslation } from '@/lib/i18n'

/**
 * Owner Dashboard Component
 * Shows: total buildings, total flats, occupancy ratio, unpaid bills (BDT),
 * 5 recent maintenance requests, 5 recent audit log entries.
 * Validates: Requirements 20.1, 20.4, 20.7
 */
export function OwnerDashboard() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useOwnerDashboard()

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

  const occupancyRatio = `${data.occupiedFlats}/${data.totalFlats}`

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
          label={t('dashboard.totalBuildings')}
          value={String(data.totalBuildings)}
        />
        <StatCard
          label={t('dashboard.totalFlats')}
          value={String(data.totalFlats)}
        />
        <StatCard
          label={t('dashboard.occupancyRate')}
          value={occupancyRatio}
          subtitle={t('dashboard.occupied')}
        />
        <StatCard
          label={t('dashboard.unpaidBills')}
          value={<CurrencyDisplay amount={data.unpaidBillsTotal} large />}
        />
      </div>

      {/* Recent Maintenance Requests */}
      <section>
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: '#374151',
          }}
        >
          {t('dashboard.recentMaintenance')}
        </h2>
        {data.recentMaintenance.length === 0 ? (
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
            {data.recentMaintenance.map((req) => (
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

      {/* Recent Audit Entries */}
      <section>
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: '#374151',
          }}
        >
          {t('dashboard.recentAudit')}
        </h2>
        {data.recentAudit.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {t('dashboard.noAuditEntries')}
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {data.recentAudit.map((entry) => (
              <div
                key={entry.id}
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
                    {entry.action}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {entry.actorName} • {entry.entityType}
                  </p>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {new Date(entry.createdAt).toLocaleDateString('bn-BD')}
                </span>
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
  subtitle?: string
}

function StatCard({ label, value, subtitle }: StatCardProps) {
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
      {subtitle && (
        <p
          style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            marginTop: '0.25rem',
          }}
        >
          {subtitle}
        </p>
      )}
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
        {['buildings', 'flats', 'occupancy', 'bills'].map((id) => (
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
      <LoadingSkeleton rows={5} showHeader />
      <LoadingSkeleton rows={5} showHeader />
    </div>
  )
}
