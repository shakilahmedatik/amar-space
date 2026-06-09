/** biome-ignore-all lint/suspicious/noArrayIndexKey: intentionally done */
'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  XCircle,
} from 'lucide-react'
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
import {
  useCancelTermination,
  useDepositRefund,
  useExecuteTermination,
  useRefundDeposit,
  useScheduleTermination,
} from '@/hooks/use-terminations'
import type { Renter } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Renter detail page — /renters/[id]
 * Shows personal info, contract details, deposit balance, adjustment form (Owner only), and adjustment history.
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
                      {renter.familyMemberNames.map((name, i) => (
                        <span
                          key={`member-${name}-${i}`}
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
                    <div className="relative group w-full max-w-50 aspect-3/2 overflow-hidden rounded-lg border border-hairline bg-surface">
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
                    <div className="relative group w-full max-w-50 h-20 overflow-hidden rounded border border-hairline bg-white p-2">
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

          {/* Termination Section */}
          {(role === 'owner' || role === 'manager') && renter.contractId && (
            <TerminationSection renter={renter} />
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
            className="min-h-11 sm:min-h-9 rounded-full border-hairline hover:bg-surface text-xs font-semibold"
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
              className="min-h-11 rounded-full text-xs font-medium self-start sm:self-auto"
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

function TerminationSection({ renter }: { renter: Renter }) {
  const { role } = useSession()
  const queryClient = useQueryClient()
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [terminationMonth, setTerminationMonth] = useState('')
  const [terminationReason, setTerminationReason] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState<
    'cancel' | 'execute' | null
  >(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const scheduleMutation = useScheduleTermination()
  const cancelMutation = useCancelTermination()
  const executeMutation = useExecuteTermination()

  const isPendingTermination = renter.contractStatus === 'pending_termination'
  const canScheduleTermination = renter.contractStatus === 'active'
  const canExecuteTermination =
    isPendingTermination && renter.scheduledTerminationDate
      ? new Date(`${renter.scheduledTerminationDate}T23:59:59`) <= new Date()
      : false

  const { data: depositRefund } = useDepositRefund(
    renter.id,
    isPendingTermination || renter.contractStatus === 'terminated',
  )
  const refundMutation = useRefundDeposit()

  if (!renter.contractId) return null

  return (
    <>
      {successMessage && (
        <ErrorFeedback
          message={successMessage}
          type="success"
          visible
          onDismiss={() => setSuccessMessage('')}
        />
      )}
      {errorMessage && (
        <ErrorFeedback
          message={errorMessage}
          type="error"
          visible
          onDismiss={() => setErrorMessage('')}
        />
      )}

      {/* Pending Termination Banner */}
      {isPendingTermination && (
        <Card className="bg-amber-50 border-amber-200 rounded-xl mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-amber-900">
                  চুক্তি বাতিলের জন্য নির্ধারিত
                </h3>
                <p className="text-sm text-amber-800 mt-1">
                  এই ভাড়াটিয়ার চুক্তি{' '}
                  {renter.scheduledTerminationDate
                    ? new Date(
                        `${renter.scheduledTerminationDate}T00:00:00`,
                      ).toLocaleDateString('bn-BD')
                    : ''}{' '}
                  তারিখে বাতিল হবে।
                </p>
                {renter.terminationReason && (
                  <p className="text-sm text-amber-700 mt-1">
                    কারণ: {renter.terminationReason}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirmDialog('cancel')}
                    disabled={cancelMutation.isPending}
                    className="min-h-9 rounded-full border-amber-300 text-amber-800 hover:bg-amber-100"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    বাতিল তলিয়ে নিন
                  </Button>
                  {canExecuteTermination && role === 'owner' && (
                    <Button
                      size="sm"
                      onClick={() => setShowConfirmDialog('execute')}
                      disabled={executeMutation.isPending}
                      className="min-h-9 rounded-full bg-error-text text-on-dark"
                    >
                      এখনই চুক্তি বাতিল করুন
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Termination Button (only for active contracts) */}
      {canScheduleTermination && (role === 'owner' || role === 'manager') && (
        <Card className="bg-canvas rounded-xl border border-hairline mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">চুক্তি বাতিলকরণ</h2>
                <p className="text-sm text-steel mt-1">
                  এই ভাড়াটিয়ার চুক্তি বাতিলের জন্য নোটিশ দিন।
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowScheduleDialog(true)}
                className="min-h-11 rounded-full border-error-text text-error-text hover:bg-red-50"
              >
                চুক্তি বাতিল নির্ধারণ করুন
              </Button>
            </div>

            {showScheduleDialog && (
              <div className="mt-4 p-4 rounded-lg border border-hairline bg-surface">
                <h3 className="text-base font-semibold text-ink mb-3">
                  বাতিলের মাস নির্বাচন করুন
                </h3>
                {errorMessage && (
                  <p className="text-xs text-error-text mb-2">{errorMessage}</p>
                )}
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="termination-month"
                      className="block text-sm font-medium text-charcoal mb-1"
                    >
                      বাতিলের মাস
                    </label>
                    <input
                      id="termination-month"
                      type="month"
                      value={terminationMonth}
                      onChange={(e) => {
                        setTerminationMonth(e.target.value)
                        setErrorMessage('')
                      }}
                      className="w-full px-3 py-2 text-sm rounded-md border border-hairline min-h-11 bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                    <p className="text-xs text-steel mt-1">
                      চুক্তি নির্বাচিত মাসের শেষ দিনে বাতিল হবে।
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="termination-reason"
                      className="block text-sm font-medium text-charcoal mb-1"
                    >
                      কারণ (ঐচ্ছিক)
                    </label>
                    <textarea
                      id="termination-reason"
                      value={terminationReason}
                      onChange={(e) => setTerminationReason(e.target.value)}
                      maxLength={500}
                      className="w-full px-3 py-2 text-sm rounded-md border border-hairline min-h-[80px] bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      placeholder="বাতিলের কারণ লিখুন..."
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowScheduleDialog(false)
                        setTerminationMonth('')
                        setTerminationReason('')
                        setErrorMessage('')
                      }}
                      className="min-h-11 rounded-full"
                    >
                      বাতিল
                    </Button>
                    <Button
                      onClick={() => {
                        if (!terminationMonth) {
                          setErrorMessage('মাস নির্বাচন করুন')
                          return
                        }
                        scheduleMutation.mutate(
                          {
                            renterId: renter.id,
                            terminationMonth,
                            reason: terminationReason || undefined,
                          },
                          {
                            onSuccess: () => {
                              setShowScheduleDialog(false)
                              setTerminationMonth('')
                              setTerminationReason('')
                              setSuccessMessage(
                                'চুক্তি বাতিলের তারিখ নির্ধারণ করা হয়েছে।',
                              )
                              queryClient.invalidateQueries({
                                queryKey: ['renters', renter.id],
                              })
                            },
                            onError: (err) => {
                              setErrorMessage(err.message || 'একটি ত্রুটি হয়েছে')
                            },
                          },
                        )
                      }}
                      disabled={scheduleMutation.isPending || !terminationMonth}
                      className="min-h-11 rounded-full bg-error-text text-on-dark"
                    >
                      {scheduleMutation.isPending
                        ? 'প্রক্রিয়াধীন...'
                        : 'নির্ধারণ করুন'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deposit Refund Section (for terminated/pending termination contracts) */}
      {(isPendingTermination || renter.contractStatus === 'terminated') &&
        depositRefund &&
        role === 'owner' && (
          <Card className="bg-canvas rounded-xl border border-hairline mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-ink mb-4 pb-2 border-b border-hairline">
                জামানত ফেরত
              </h2>
              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    মোট জামানত
                  </p>
                  <CurrencyDisplay
                    amount={depositRefund.securityDepositAmount}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    বাকি জামানত
                  </p>
                  <CurrencyDisplay
                    amount={depositRefund.remainingDepositBalance}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    বকেয়া বিল
                  </p>
                  <CurrencyDisplay
                    amount={depositRefund.outstandingBillTotal}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    প্রস্তাবিত ফেরত
                  </p>
                  <CurrencyDisplay
                    amount={depositRefund.suggestedRefund}
                    large
                  />
                </div>
              </div>
              {depositRefund.suggestedRefund > 0 && (
                <div className="mt-4">
                  <Button
                    onClick={() => {
                      refundMutation.mutate(
                        {
                          renterId: renter.id,
                          refundAmount: depositRefund.suggestedRefund,
                        },
                        {
                          onSuccess: () => {
                            setSuccessMessage('জামানত ফেরত সফলভাবে প্রক্রিয়া হয়েছে।')
                            queryClient.invalidateQueries({
                              queryKey: ['renters', renter.id],
                            })
                            queryClient.invalidateQueries({
                              queryKey: ['deposit-refund', renter.id],
                            })
                          },
                          onError: (err) => {
                            setErrorMessage(err.message || 'ফেরত প্রক্রিয়ায় ত্রুটি')
                          },
                        },
                      )
                    }}
                    disabled={refundMutation.isPending}
                    className="min-h-11 rounded-full bg-primary text-on-primary"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {refundMutation.isPending
                      ? 'প্রক্রিয়াধীন...'
                      : 'জামানত ফেরত প্রক্রিয়া করুন'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      <ConfirmDialog
        open={showConfirmDialog === 'cancel'}
        onClose={() => setShowConfirmDialog(null)}
        onConfirm={() => {
          cancelMutation.mutate(renter.id, {
            onSuccess: () => {
              setShowConfirmDialog(null)
              setSuccessMessage('চুক্তি বাতিলের নির্ধারণ তুলে নেওয়া হয়েছে।')
              queryClient.invalidateQueries({
                queryKey: ['renters', renter.id],
              })
            },
            onError: (err) => {
              setShowConfirmDialog(null)
              setErrorMessage(err.message || 'বাতিল করতে ত্রুটি')
            },
          })
        }}
        title="চুক্তি বাতিলের নির্ধারণ তুলে নিন"
        description="আপনি কি নিশ্চিত যে আপনি চুক্তি বাতিলের নির্ধারণ তুলে নিতে চান? চুক্তিটি আবার সক্রিয় হয়ে যাবে।"
        confirmLabel="নির্ধারণ তুলে নিন"
        cancelLabel="না"
        destructive
        loading={cancelMutation.isPending}
      />

      <ConfirmDialog
        open={showConfirmDialog === 'execute'}
        onClose={() => setShowConfirmDialog(null)}
        onConfirm={() => {
          executeMutation.mutate(renter.id, {
            onSuccess: () => {
              setShowConfirmDialog(null)
              setSuccessMessage('চুক্তি সফলভাবে বাতিল করা হয়েছে। ফ্ল্যাটটি এখন খালি।')
              queryClient.invalidateQueries({
                queryKey: ['renters', renter.id],
              })
            },
            onError: (err) => {
              setShowConfirmDialog(null)
              setErrorMessage(err.message || 'বাতিল করতে ত্রুটি')
            },
          })
        }}
        title="চুক্তি বাতিল করুন"
        description="আপনি কি নিশ্চিত? চুক্তিটি বাতিল হলে ভাড়াটিয়ার অ্যাকাউন্ট নিষ্ক্রিয় হবে এবং ফ্ল্যাটটি খালি হিসেবে চিহ্নিত হবে।"
        confirmLabel="চুক্তি বাতিল করুন"
        cancelLabel="না"
        destructive
        loading={executeMutation.isPending}
      />
    </>
  )
}
