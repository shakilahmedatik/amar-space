'use client'

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

  // Handle no-flat-assigned state (Requirement 20.8)
  if (!data.flat) {
    return (
      <div
        style={{
          padding: '2rem',
          backgroundColor: '#fffbeb',
          borderRadius: '0.75rem',
          border: '1px solid #fde68a',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '2.5rem',
            marginBottom: '1rem',
          }}
          aria-hidden="true"
        >
          🏠
        </div>
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#92400e',
            marginBottom: '0.5rem',
          }}
        >
          {t('dashboard.noFlatAssigned')}
        </h2>
        <p style={{ color: '#a16207', fontSize: '0.875rem' }}>
          {t('dashboard.noFlatAssignedDescription')}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Flat Info Card */}
      <div
        style={{
          padding: '1.25rem',
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '0.75rem',
          }}
        >
          {t('dashboard.myFlat')}
        </h2>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {t('dashboard.buildingName')}
            </span>
            <span style={{ fontWeight: 500, color: '#111827' }}>
              {data.flat.buildingName}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {t('dashboard.flatAddress')}
            </span>
            <span style={{ fontWeight: 500, color: '#111827' }}>
              {t('flats.flatNumber')}: {data.flat.flatNumber},{' '}
              {t('flats.floor')}: {data.flat.floor}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {t('buildings.address')}
            </span>
            <span style={{ fontWeight: 500, color: '#111827' }}>
              {data.flat.buildingAddress}
            </span>
          </div>
        </div>
      </div>

      {/* Current Bill & Deposit */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Current Bill */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <h3
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '0.75rem',
            }}
          >
            {t('dashboard.currentBill')}
          </h3>
          {data.currentBill ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <CurrencyDisplay amount={data.currentBill.totalAmount} large />
                <StatusBadge status={data.currentBill.status} />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {t('dashboard.billingMonth')}: {data.currentBill.billingMonth}
              </p>
              {data.currentBill.paidAmount > 0 && (
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {t('bills.paidAmount')}:{' '}
                  <CurrencyDisplay amount={data.currentBill.paidAmount} />
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {t('dashboard.noBillThisMonth')}
            </p>
          )}
        </div>

        {/* Deposit Balance */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <h3
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '0.75rem',
            }}
          >
            {t('dashboard.depositBalance')}
          </h3>
          <CurrencyDisplay amount={data.depositBalance} large />
        </div>
      </div>

      {/* Active Maintenance Requests */}
      <section>
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: '#374151',
          }}
        >
          {t('dashboard.activeMaintenanceRequests')}
        </h2>
        {data.activeMaintenanceRequests.length === 0 ? (
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
            {data.activeMaintenanceRequests.map((req) => (
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
                    {new Date(req.createdAt).toLocaleDateString('bn-BD')}
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

// --- Loading Skeleton ---

function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          padding: '1.25rem',
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
        }}
      >
        <LoadingSkeleton rows={3} rowHeight={16} showHeader />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
        }}
      >
        {['bill-card', 'deposit-card'].map((id) => (
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
    </div>
  )
}
