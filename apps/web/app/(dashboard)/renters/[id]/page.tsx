'use client'

import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  DepositAdjustmentForm,
  DepositAdjustmentHistory,
  DepositBalanceCard,
} from '@/components/deposits'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { DateDisplay } from '@/components/ui/date-display'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useSession } from '@/contexts/session-context'
import { useRenter, useResetRenterAccessCode } from '@/hooks/use-renters'
import type { Renter } from '@/lib/api-client'
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

          {/* Documents / Uploaded files */}
          <Card className="bg-canvas rounded-xl border border-hairline mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-ink mb-4 pb-2 border-b border-hairline">
                সংযুক্ত ফাইলসমূহ (NID, সেলফি ও ডিজিটাল স্বাক্ষর)
              </h2>

              <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                {/* Selfie Photo */}
                <div className="flex flex-col items-center p-4 bg-white border border-hairline rounded-xl text-center shadow-sm">
                  <span className="text-sm font-semibold text-steel mb-3">
                    ভাড়াটিয়ার সেলফি ছবি
                  </span>
                  {renter.selfiePhotoUrl ? (
                    <div className="relative group w-32 h-32 rounded-full overflow-hidden border border-hairline bg-surface">
                      {/* biome-ignore lint/performance/noImgElement: R2 public url rendering */}
                      <img
                        src={renter.selfiePhotoUrl}
                        alt="সেলফি"
                        className="w-full h-full object-cover"
                      />
                      <a
                        href={renter.selfiePhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        বড় করে দেখুন
                      </a>
                    </div>
                  ) : (
                    <span className="text-sm text-steel py-12">
                      কোনো ছবি নেই
                    </span>
                  )}
                </div>

                {/* NID Card */}
                <div className="flex flex-col items-center p-4 bg-white border border-hairline rounded-xl text-center shadow-sm">
                  <span className="text-sm font-semibold text-steel mb-3">
                    জাতীয় পরিচয়পত্র (NID)
                  </span>
                  {renter.nidPhotoUrl ? (
                    <div className="relative group w-full max-w-[200px] aspect-3/2 overflow-hidden rounded-lg border border-hairline bg-surface">
                      {/* biome-ignore lint/performance/noImgElement: R2 public url rendering */}
                      <img
                        src={renter.nidPhotoUrl}
                        alt="NID"
                        className="w-full h-full object-cover"
                      />
                      <a
                        href={renter.nidPhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        বড় করে দেখুন
                      </a>
                    </div>
                  ) : (
                    <span className="text-sm text-steel py-12">
                      কোনো ছবি নেই
                    </span>
                  )}
                </div>

                {/* Digital Signature */}
                <div className="flex flex-col items-center p-4 bg-white border border-hairline rounded-xl text-center shadow-sm">
                  <span className="text-sm font-semibold text-steel mb-3">
                    ডিজিটাল স্বাক্ষর
                  </span>
                  {renter.digitalSignatureUrl ? (
                    <div className="relative group w-full max-w-[200px] h-20 overflow-hidden rounded border border-hairline bg-white p-2">
                      {/* biome-ignore lint/performance/noImgElement: R2 public url rendering */}
                      <img
                        src={renter.digitalSignatureUrl}
                        alt="স্বাক্ষর"
                        className="w-full h-full object-contain"
                      />
                      <a
                        href={renter.digitalSignatureUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        বড় করে দেখুন
                      </a>
                    </div>
                  ) : (
                    <span className="text-sm text-steel py-8">
                      কোনো স্বাক্ষর নেই
                    </span>
                  )}
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

          {/* Access Code Card */}
          {(role === 'owner' || role === 'manager') && (
            <PortalAccessCodeCard renter={renter} />
          )}

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

/** Component for displaying and managing renter portal access codes */
function PortalAccessCodeCard({ renter }: { renter: Renter }) {
  const { t } = useTranslation()
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)

  const resetMutation = useResetRenterAccessCode()

  const handleCopy = (codeText: string) => {
    navigator.clipboard.writeText(codeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerate = () => {
    resetMutation.mutate(renter.id, {
      onSuccess: (data) => {
        setGeneratedCode(data.code)
        setShowCode(true)
        setConfirmOpen(false)
      },
    })
  }

  const codeToShow = renter.accessCode || '------'
  const displayCode = showCode ? codeToShow : '••••••'

  return (
    <Card className="bg-canvas rounded-xl border border-hairline mb-6 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-hairline mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-surface text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {t('renters.accessCodeCardTitle')}
              </h2>
              <p className="text-xs text-steel">
                ভাড়াটিয়ার পোর্টাল লগইন ও ভেরিফিকেশনের জন্য অ্যাক্সেস কোড
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={resetMutation.isPending}
            className="min-h-[44px] sm:min-h-[36px] rounded-full border-hairline hover:bg-surface text-xs font-semibold"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${resetMutation.isPending ? 'animate-spin' : ''}`}
            />
            {t('renters.generateNewCode')}
          </Button>
        </div>

        {generatedCode && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 animate-in fade-in slide-in-from-top-1 duration-250">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-1">
              <Check className="h-4 w-4 text-emerald-600" />
              {t('renters.newCodeGenerated')}
            </h3>
            <p className="text-xs mb-3 text-emerald-700">
              নিচের নতুন ৬-ডিজিটের অ্যাক্সেস কোডটি ভাড়াটিয়াকে পাঠিয়ে দিন। নিরাপত্তা স্বার্থে
              এটি পুনরায় প্রদর্শিত হবে না।
            </p>
            <div className="flex items-center gap-3 bg-white border border-emerald-100 rounded-lg p-3 w-fit">
              <span className="text-2xl font-mono font-bold tracking-widest text-emerald-900">
                {generatedCode}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(generatedCode)}
                className="h-8 px-2 rounded-md hover:bg-emerald-50 text-emerald-700"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="sr-only">{t('renters.copyCode')}</span>
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface rounded-xl p-4 border border-hairline">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-steel">
              {t('renters.accessCodeLabel')}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xl font-mono font-semibold tracking-wider text-ink">
                {displayCode}
              </span>
              {renter.accessCode && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCode(!showCode)}
                  className="h-8 w-8 text-steel hover:text-ink rounded-full"
                >
                  {showCode ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showCode ? t('renters.hideCode') : t('renters.showCode')}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {renter.accessCode && (
            <Button
              variant="secondary"
              onClick={() => handleCopy(renter.accessCode!)}
              className="min-h-[44px] rounded-full text-xs font-medium self-start sm:self-auto"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  {t('renters.codeCopied')}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t('renters.copyCode')}
                </>
              )}
            </Button>
          )}
        </div>

        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleGenerate}
          title={t('renters.generateNewCodeConfirmTitle')}
          description={t('renters.generateNewCodeConfirmDesc')}
          confirmLabel={t('renters.generateNewCode')}
          loading={resetMutation.isPending}
          destructive={true}
        />
      </CardContent>
    </Card>
  )
}
