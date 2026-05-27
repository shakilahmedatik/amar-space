'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  DepositAdjustmentForm,
  DepositAdjustmentHistory,
  DepositBalanceCard,
} from '@/components/deposits'
import { DashboardLayout } from '@/components/layout'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { DateDisplay } from '@/components/ui/date-display'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useRenter } from '@/hooks/use-renters'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Renter detail page — /renters/[id]
 * Shows personal info, contract details, deposit balance, adjustment form (Owner only), and adjustment history.
 * Validates: Requirements 4.1, 9.7, 9.8, 9.9, 9.11, 9.12
 */
export default function RenterDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const renterId = params.id as string

  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  const { data: renter, isLoading, isError, error } = useRenter(renterId)

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

  return (
    <DashboardLayout role={role} activePath="/renters">
      {isError && (
        <ErrorFeedback
          message={error?.message || t('renters.loadError')}
          type="error"
          visible
        />
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <a
          href="/renters"
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            textDecoration: 'none',
          }}
        >
          ← {t('common.back')}
        </a>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : renter ? (
        <>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '1.5rem',
            }}
          >
            {t('renters.renterDetail')}
          </h1>

          {/* Deposit Balance - Prominent display (Requirement 9.12) */}
          <DepositBalanceCard
            securityDepositAmount={renter.depositBalance}
            remainingBalance={renter.depositBalance}
          />

          {/* Personal Information */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              marginBottom: '1.5rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              {t('renters.personalInfo')}
            </h2>

            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              }}
            >
              <InfoField
                label={t('renters.fullName')}
                value={renter.fullName}
              />
              <InfoField label={t('renters.phone')} value={renter.phone} />
              <InfoField
                label={t('renters.nidNumber')}
                value={renter.nidNumber}
              />
              <InfoField
                label={t('renters.occupation')}
                value={renter.occupation}
              />
              <InfoField
                label={t('renters.bloodGroup')}
                value={renter.bloodGroup}
              />
              <InfoField
                label={t('renters.familyMembers')}
                value={String(renter.totalFamilyMembers)}
              />
              {renter.dateOfBirth && (
                <div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {t('renters.dateOfBirth')}
                  </p>
                  <DateDisplay date={renter.dateOfBirth} />
                </div>
              )}
            </div>

            {/* Family Member Names */}
            {renter.familyMemberNames &&
              renter.familyMemberNames.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {t('renters.familyMemberNames')}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    {renter.familyMemberNames.map((name) => (
                      <span
                        key={`member-${name}`}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          backgroundColor: '#f3f4f6',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Emergency Contact */}
            <div style={{ marginTop: '1.5rem' }}>
              <h3
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '0.75rem',
                }}
              >
                {t('renters.emergencyContact')}
              </h3>
              <div
                style={{
                  display: 'grid',
                  gap: '1rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                }}
              >
                <InfoField
                  label={t('renters.emergencyContactName')}
                  value={renter.emergencyContactName}
                />
                <InfoField
                  label={t('renters.emergencyContactNumber')}
                  value={renter.emergencyContactNumber}
                />
                <InfoField
                  label={t('renters.emergencyContactRelationship')}
                  value={renter.emergencyContactRelationship}
                />
              </div>
            </div>
          </div>

          {/* Contract Information */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              marginBottom: '1.5rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              {t('renters.contractInfo')}
            </h2>

            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              }}
            >
              <InfoField label={t('renters.flat')} value={renter.flatNumber} />
              <InfoField
                label={t('renters.building')}
                value={renter.buildingName}
              />
              <div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('renters.monthlyRent')}
                </p>
                <CurrencyDisplay amount={renter.monthlyRent} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('renters.rentalStartDate')}
                </p>
                <DateDisplay date={renter.startDate} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('renters.depositBalance')}
                </p>
                <CurrencyDisplay amount={renter.depositBalance} />
              </div>
            </div>
          </div>

          {/* Deposit Adjustment Form - Owner only (Requirement 9.7, 9.8, 9.9) */}
          {role === 'owner' && renter.contractId && (
            <DepositAdjustmentForm
              contractId={renter.contractId}
              remainingBalance={renter.depositBalance}
            />
          )}

          {/* Deposit Adjustment History (Requirement 9.11) */}
          {renter.contractId && (
            <DepositAdjustmentHistory contractId={renter.contractId} />
          )}

          {/* Registration Date */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#6b7280',
                }}
              >
                {t('renters.createdAt')}:
              </span>
              <DateDisplay date={renter.createdAt} />
            </div>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  )
}

/** Helper component for displaying a label-value pair */
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          color: '#6b7280',
          marginBottom: '0.25rem',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '1rem',
          color: '#111827',
        }}
      >
        {value}
      </p>
    </div>
  )
}
