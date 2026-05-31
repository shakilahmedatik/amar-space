'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  DepositAdjustmentForm,
  DepositAdjustmentHistory,
  DepositBalanceCard,
} from '@/components/deposits'
import { Card, CardContent } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { DateDisplay } from '@/components/ui/date-display'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useSession } from '@/contexts/session-context'
import { useRenter } from '@/hooks/use-renters'
import { useTranslation } from '@/lib/i18n'

/**
 * Renter detail page — /renters/[id]
 * Shows personal info, contract details, deposit balance, adjustment form (Owner only), and adjustment history.
 * Validates: Requirements 4.1, 9.7, 9.8, 9.9, 9.11, 9.12
 */
export default function RenterDetailPage() {
  const { role } = useSession()
  const { t } = useTranslation()
  const params = useParams()
  const _router = useRouter()
  const renterId = params.id as string
  const { data: renter, isLoading, isError, error } = useRenter(renterId)
  return (
    <>
      {isError && (
        <ErrorFeedback
          message={error?.message || t('renters.loadError')}
          type="error"
          visible
        />
      )}

      <div className="mb-6">
        <Link
          href="/renters"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : renter ? (
        <>
          <h1 className="text-2xl font-bold text-ink mb-6">
            {t('renters.renterDetail')}
          </h1>

          {/* Deposit Balance - Prominent display (Requirement 9.12) */}
          <DepositBalanceCard
            securityDepositAmount={renter.depositBalance}
            remainingBalance={renter.depositBalance}
          />

          {/* Personal Information */}
          <Card className="bg-canvas rounded-xl border border-hairline mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-ink mb-4 pb-2 border-b border-hairline">
                {t('renters.personalInfo')}
              </h2>

              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
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
                    <p className="text-xs font-medium text-steel mb-1">
                      {t('renters.dateOfBirth')}
                    </p>
                    <DateDisplay date={renter.dateOfBirth} />
                  </div>
                )}
              </div>

              {/* Family Member Names */}
              {renter.familyMemberNames &&
                renter.familyMemberNames.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-steel mb-2">
                      {t('renters.familyMemberNames')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {renter.familyMemberNames.map((name) => (
                        <span
                          key={`member-${name}`}
                          className="px-2 py-1 rounded bg-surface text-sm text-ink"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Emergency Contact */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-charcoal mb-3">
                  {t('renters.emergencyContact')}
                </h3>
                <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
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
            </CardContent>
          </Card>

          {/* Contract Information */}
          <Card className="bg-canvas rounded-xl border border-hairline mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-ink mb-4 pb-2 border-b border-hairline">
                {t('renters.contractInfo')}
              </h2>

              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                <InfoField
                  label={t('renters.flat')}
                  value={renter.flatNumber}
                />
                <InfoField
                  label={t('renters.building')}
                  value={renter.buildingName}
                />
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    {t('renters.monthlyRent')}
                  </p>
                  <CurrencyDisplay amount={renter.monthlyRent} />
                </div>
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    {t('renters.rentalStartDate')}
                  </p>
                  <DateDisplay date={renter.startDate} />
                </div>
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    {t('renters.depositBalance')}
                  </p>
                  <CurrencyDisplay amount={renter.depositBalance} />
                </div>
              </div>
            </CardContent>
          </Card>

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
          <Card className="bg-canvas rounded-xl border border-hairline">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-steel">
                  {t('renters.createdAt')}:
                </span>
                <DateDisplay date={renter.createdAt} />
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </>
  )
}

/** Helper component for displaying a label-value pair */
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-steel mb-1">{label}</p>
      <p className="text-base text-ink">{value}</p>
    </div>
  )
}
