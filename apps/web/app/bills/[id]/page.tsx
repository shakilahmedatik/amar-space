'use client'

import { useParams } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
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
      <div className="flex h-dvh items-center justify-center bg-gray-50">
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

      <div style={{ marginBottom: '1.5rem' }}>
        <a
          href="/bills"
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
      ) : bill ? (
        <>
          {/* Bill Summary Section */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                {t('bills.billDetail')}
              </h1>
              <StatusBadge status={bill.status} />
            </div>

            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}
                >
                  {t('bills.billMonth')}
                </p>
                <p
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#111827',
                  }}
                >
                  {bill.billingMonth}
                </p>
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
                  {t('bills.renter')}
                </p>
                <p style={{ fontSize: '1rem', color: '#111827' }}>
                  {bill.renterName}
                </p>
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
                  {t('bills.flat')}
                </p>
                <p style={{ fontSize: '1rem', color: '#111827' }}>
                  {bill.flatNumber} — {bill.buildingName}
                </p>
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
                  {t('bills.baseRent')}
                </p>
                <CurrencyDisplay amount={bill.baseRent} />
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
                  {t('bills.totalAmount')}
                </p>
                <CurrencyDisplay amount={bill.totalAmount} large />
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
                  {t('bills.paidAmount')}
                </p>
                <CurrencyDisplay amount={bill.paidAmount} />
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
                  {t('bills.remainingBalance')}
                </p>
                <CurrencyDisplay
                  amount={bill.totalAmount - bill.paidAmount}
                  large
                />
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                {t('bills.lineItems')} ({bill.lineItems.length}/20)
              </h2>

              {canAddCharge && bill.lineItems.length < 20 && (
                <button
                  type="button"
                  onClick={() => setShowChargeForm(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '44px',
                    minHeight: '44px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    borderRadius: '0.375rem',
                    backgroundColor: 'transparent',
                    color: '#2563eb',
                    border: '1px solid #2563eb',
                    cursor: 'pointer',
                  }}
                >
                  {t('bills.addCharge')}
                </button>
              )}
            </div>

            {/* Add Charge Form */}
            {showChargeForm && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  marginBottom: '1rem',
                }}
              >
                {chargeErrors.form && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#dc2626',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {chargeErrors.form}
                  </p>
                )}
                <form
                  onSubmit={handleAddCharge}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    alignItems: 'flex-end',
                  }}
                >
                  <div style={{ flex: '2 1 200px' }}>
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
                  <div style={{ flex: '1 1 120px' }}>
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
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      paddingBottom: '0.25rem',
                    }}
                  >
                    <button
                      type="submit"
                      disabled={addChargeMutation.isPending}
                      style={{
                        minWidth: '44px',
                        minHeight: '44px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        borderRadius: '0.375rem',
                        backgroundColor: addChargeMutation.isPending
                          ? '#93c5fd'
                          : '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        cursor: addChargeMutation.isPending
                          ? 'not-allowed'
                          : 'pointer',
                      }}
                    >
                      {addChargeMutation.isPending
                        ? t('common.loading')
                        : t('common.save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChargeForm(false)
                        setChargeDescription('')
                        setChargeAmount('')
                        setChargeErrors({})
                      }}
                      style={{
                        minWidth: '44px',
                        minHeight: '44px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        borderRadius: '0.375rem',
                        backgroundColor: 'transparent',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        cursor: 'pointer',
                      }}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Line Items Table */}
            {bill.lineItems.length === 0 ? (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  textAlign: 'center',
                  padding: '1.5rem',
                }}
              >
                {t('bills.noLineItems')}
              </p>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  borderRadius: '0.375rem',
                  border: '1px solid #e5e7eb',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.875rem',
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th
                        style={{
                          padding: '0.625rem 1rem',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        {t('bills.description')}
                      </th>
                      <th
                        style={{
                          padding: '0.625rem 1rem',
                          textAlign: 'right',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          backgroundColor: '#f9fafb',
                          width: '140px',
                        }}
                      >
                        {t('bills.amount')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.lineItems.map((item) => (
                      <tr
                        key={item.id}
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
                        <td style={{ padding: '0.625rem 1rem' }}>
                          {item.description}
                        </td>
                        <td
                          style={{
                            padding: '0.625rem 1rem',
                            textAlign: 'right',
                          }}
                        >
                          <CurrencyDisplay amount={item.amount} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment History Section */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
            }}
          >
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '1rem',
              }}
            >
              {t('bills.paymentHistory')}
            </h2>

            {bill.payments.length === 0 ? (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  textAlign: 'center',
                  padding: '1.5rem',
                }}
              >
                {t('bills.noPayments')}
              </p>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  borderRadius: '0.375rem',
                  border: '1px solid #e5e7eb',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.875rem',
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th
                        style={{
                          padding: '0.625rem 1rem',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        {t('bills.paymentDate')}
                      </th>
                      <th
                        style={{
                          padding: '0.625rem 1rem',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        {t('bills.paymentMethod')}
                      </th>
                      <th
                        style={{
                          padding: '0.625rem 1rem',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        {t('bills.receiptRef')}
                      </th>
                      <th
                        style={{
                          padding: '0.625rem 1rem',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        {t('bills.note')}
                      </th>
                      <th
                        style={{
                          padding: '0.625rem 1rem',
                          textAlign: 'right',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          backgroundColor: '#f9fafb',
                          width: '140px',
                        }}
                      >
                        {t('bills.amount')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.payments.map((payment) => (
                      <tr
                        key={payment.id}
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
                        <td style={{ padding: '0.625rem 1rem' }}>
                          {payment.paymentDate}
                        </td>
                        <td style={{ padding: '0.625rem 1rem' }}>
                          {payment.paymentMethod}
                        </td>
                        <td
                          style={{
                            padding: '0.625rem 1rem',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                          }}
                        >
                          {payment.receiptReference}
                        </td>
                        <td
                          style={{
                            padding: '0.625rem 1rem',
                            color: '#6b7280',
                          }}
                        >
                          {payment.note || '—'}
                        </td>
                        <td
                          style={{
                            padding: '0.625rem 1rem',
                            textAlign: 'right',
                          }}
                        >
                          <CurrencyDisplay amount={payment.amount} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </DashboardLayout>
  )
}
