'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAddUtilityCharge, useBill } from '@/hooks/use-bills'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Bill detail page — /bills/[id]
 * Shows bill info with line items and payment history.
 * Owner/Manager can add utility charges (max 20 line items).
 * Validates: Requirements 7.1, 7.2, 7.7, 7.8
 */
export default function BillDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const router = useRouter()
  const billId = params.id as string

  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  // Add charge form state
  const [showChargeForm, setShowChargeForm] = useState(false)
  const [chargeDescription, setChargeDescription] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')
  const [chargeErrors, setChargeErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const { data: bill, isLoading, isError, error } = useBill(billId)
  const addChargeMutation = useAddUtilityCharge(billId)

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

  function validateCharge(): boolean {
    const errors: Record<string, string> = {}

    if (!chargeDescription.trim()) {
      errors.description = t('bills.descriptionRequired')
    } else if (chargeDescription.trim().length > 200) {
      errors.description = t('bills.descriptionMaxLength')
    }

    const amount = Number.parseFloat(chargeAmount)
    if (!chargeAmount.trim()) {
      errors.amount = t('bills.amountRequired')
    } else if (Number.isNaN(amount) || amount < 0.01) {
      errors.amount = t('bills.amountMin')
    } else if (amount > 999999.99) {
      errors.amount = t('bills.amountMax')
    }

    setChargeErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleAddCharge(e: FormEvent) {
    e.preventDefault()
    if (!validateCharge()) return

    // Enforce max 20 line items
    if (bill && bill.lineItems.length >= 20) {
      setChargeErrors({ form: t('bills.maxLineItems') })
      return
    }

    try {
      await addChargeMutation.mutateAsync({
        description: chargeDescription.trim(),
        amount: Number.parseFloat(chargeAmount),
      })
      setShowChargeForm(false)
      setChargeDescription('')
      setChargeAmount('')
      setChargeErrors({})
      setSuccessMessage(t('bills.chargeSuccess'))
    } catch (err) {
      setChargeErrors({
        form: err instanceof Error ? err.message : t('bills.chargeError'),
      })
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
  const canAddCharge = role === 'owner' || role === 'manager'

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

      <div className="mb-6">
        <Link
          href="/bills"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : bill ? (
        <>
          {/* Bill Summary Section */}
          <Card className="bg-canvas rounded-xl border border-hairline mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-ink">
                  {t('bills.billDetail')}
                </h1>
                <StatusBadge status={bill.status} />
              </div>

              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    {t('bills.billMonth')}
                  </p>
                  <p className="text-base font-semibold text-ink">
                    {bill.billingMonth}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    {t('bills.renter')}
                  </p>
                  <p className="text-base text-ink">{bill.renterName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    {t('bills.flat')}
                  </p>
                  <p className="text-base text-ink">
                    {bill.flatNumber} — {bill.buildingName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    {t('bills.baseRent')}
                  </p>
                  <CurrencyDisplay amount={bill.baseRent} />
                </div>
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    {t('bills.totalAmount')}
                  </p>
                  <CurrencyDisplay amount={bill.totalAmount} large />
                </div>
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    {t('bills.paidAmount')}
                  </p>
                  <CurrencyDisplay amount={bill.paidAmount} />
                </div>
                <div>
                  <p className="text-xs font-medium text-steel mb-1">
                    {t('bills.remainingBalance')}
                  </p>
                  <CurrencyDisplay
                    amount={bill.totalAmount - bill.paidAmount}
                    large
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items Section */}
          <Card className="bg-canvas rounded-xl border border-hairline mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-lg font-semibold text-ink">
                  {t('bills.lineItems')} ({bill.lineItems.length}/20)
                </h2>

                {canAddCharge && bill.lineItems.length < 20 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowChargeForm(true)}
                    className="min-h-[44px] rounded-full border-brand-blue-deep text-brand-blue-deep hover:bg-brand-blue-200"
                  >
                    {t('bills.addCharge')}
                  </Button>
                )}
              </div>

              {/* Add Charge Form */}
              {showChargeForm && (
                <div className="p-4 rounded-lg border border-hairline bg-surface mb-4">
                  {chargeErrors.form && (
                    <p className="text-xs text-error-text mb-3">
                      {chargeErrors.form}
                    </p>
                  )}
                  <form
                    onSubmit={handleAddCharge}
                    className="flex flex-wrap gap-3 items-end"
                  >
                    <div className="flex-[2_1_200px]">
                      <FormField
                        label={t('bills.description')}
                        required
                        error={chargeErrors.description}
                        htmlFor="charge-description"
                      >
                        <FormInput
                          id="charge-description"
                          type="text"
                          value={chargeDescription}
                          onChange={(e) => setChargeDescription(e.target.value)}
                          hasError={!!chargeErrors.description}
                          maxLength={200}
                          placeholder={t('bills.description')}
                        />
                      </FormField>
                    </div>
                    <div className="flex-[1_1_120px]">
                      <FormField
                        label={t('bills.amount')}
                        required
                        error={chargeErrors.amount}
                        htmlFor="charge-amount"
                      >
                        <FormInput
                          id="charge-amount"
                          type="number"
                          value={chargeAmount}
                          onChange={(e) => setChargeAmount(e.target.value)}
                          hasError={!!chargeErrors.amount}
                          min={0.01}
                          max={999999.99}
                          step="0.01"
                          placeholder="0.00"
                        />
                      </FormField>
                    </div>
                    <div className="flex gap-2 pb-1">
                      <Button
                        type="submit"
                        disabled={addChargeMutation.isPending}
                        className="min-h-[44px] rounded-full bg-primary text-on-primary font-semibold disabled:opacity-50"
                      >
                        {addChargeMutation.isPending
                          ? t('common.loading')
                          : t('common.save')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowChargeForm(false)
                          setChargeDescription('')
                          setChargeAmount('')
                          setChargeErrors({})
                        }}
                        className="min-h-[44px] rounded-full border-hairline text-charcoal"
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Line Items Table */}
              {bill.lineItems.length === 0 ? (
                <p className="text-sm text-steel text-center py-6">
                  {t('bills.noLineItems')}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-hairline">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-hairline">
                        <th className="px-4 py-3 text-left font-semibold text-xs text-steel uppercase bg-surface">
                          {t('bills.description')}
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-xs text-steel uppercase bg-surface w-[140px]">
                          {t('bills.amount')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.lineItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-hairline-soft min-h-section-sm"
                        >
                          <td className="px-4 py-3 text-ink">
                            {item.description}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CurrencyDisplay amount={item.amount} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History Section */}
          <Card className="bg-canvas rounded-xl border border-hairline">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-ink mb-4">
                {t('bills.paymentHistory')}
              </h2>

              {bill.payments.length === 0 ? (
                <p className="text-sm text-steel text-center py-6">
                  {t('bills.noPayments')}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-hairline">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-hairline">
                        <th className="px-4 py-3 text-left font-semibold text-xs text-steel uppercase bg-surface">
                          {t('bills.paymentDate')}
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-steel uppercase bg-surface">
                          {t('bills.paymentMethod')}
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-steel uppercase bg-surface">
                          {t('bills.receiptRef')}
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-steel uppercase bg-surface">
                          {t('bills.note')}
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-xs text-steel uppercase bg-surface w-[140px]">
                          {t('bills.amount')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.payments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-hairline-soft min-h-section-sm"
                        >
                          <td className="px-4 py-3 text-ink">
                            {payment.paymentDate}
                          </td>
                          <td className="px-4 py-3 text-ink">
                            {payment.paymentMethod}
                          </td>
                          <td className="px-4 py-3 font-mono text-[0.8rem] text-ink">
                            {payment.receiptReference}
                          </td>
                          <td className="px-4 py-3 text-steel">
                            {payment.note || '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CurrencyDisplay amount={payment.amount} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </DashboardLayout>
  )
}
