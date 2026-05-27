'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useRecordPayment, useUnpaidBills } from '@/hooks/use-payments'
import type { PaymentMethod } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

interface FormErrors {
  billId?: string
  amount?: string
  paymentDate?: string
  paymentMethod?: string
  note?: string
}

/**
 * Payment recording form page — /payments/new
 * Form with amount, date, method, note fields.
 * Validates: Requirements 8.1, 8.5, 8.6
 */
export default function RecordPaymentPage() {
  const { t } = useTranslation()
  const [role, setRole] = useState<UserRole>('owner')
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  // Form state
  const [billId, setBillId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [successMessage, setSuccessMessage] = useState('')

  const { data: billsData, isLoading: billsLoading } = useUnpaidBills()
  const recordMutation = useRecordPayment()

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
        const userRole = session.role as UserRole
        if (userRole === 'renter') {
          window.location.href = '/payments'
          return
        }
        setRole(userRole)
      } catch {
        window.location.href = '/login'
      } finally {
        setIsLoadingSession(false)
      }
    }
    loadSession()
  }, [])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!billId) {
      newErrors.billId = t('payments.billRequired')
    }

    const amountNum = Number.parseFloat(amount)
    if (!amount || Number.isNaN(amountNum)) {
      newErrors.amount = t('payments.amountRequired')
    } else if (amountNum < 0.01) {
      newErrors.amount = t('payments.amountMin')
    } else if (amountNum > 999999999.99) {
      newErrors.amount = t('payments.amountMax')
    } else {
      // Check max 2 decimal places
      const parts = amount.split('.')
      if (parts[1] && parts[1].length > 2) {
        newErrors.amount = t('payments.amountDecimal')
      }
    }

    if (!paymentDate) {
      newErrors.paymentDate = t('payments.dateRequired')
    } else {
      const selectedDate = new Date(paymentDate)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (selectedDate > today) {
        newErrors.paymentDate = t('payments.dateNotFuture')
      }
      const pastLimit = new Date()
      pastLimit.setDate(pastLimit.getDate() - 365)
      pastLimit.setHours(0, 0, 0, 0)
      if (selectedDate < pastLimit) {
        newErrors.paymentDate = t('payments.datePastLimit')
      }
    }

    if (!paymentMethod) {
      newErrors.paymentMethod = t('payments.methodRequired')
    }

    if (note && note.length > 500) {
      newErrors.note = t('payments.noteMax')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')

    if (!validateForm()) return

    try {
      await recordMutation.mutateAsync({
        billId,
        amount: Number.parseFloat(amount),
        paymentDate,
        paymentMethod: paymentMethod as PaymentMethod,
        note: note || undefined,
      })
      setSuccessMessage(t('payments.recordSuccess'))
      // Reset form
      setBillId('')
      setAmount('')
      setPaymentDate('')
      setPaymentMethod('')
      setNote('')
      setErrors({})
    } catch {
      // Error is handled by mutation state
    }
  }

  if (isLoadingSession) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4">
          <LoadingSkeleton rows={5} showHeader />
        </div>
      </div>
    )
  }

  const selectedBill = billsData?.data?.find((b) => b.id === billId)
  const remainingBalance = selectedBill
    ? Number(selectedBill.totalAmount) - Number(selectedBill.paidAmount)
    : null

  return (
    <DashboardLayout role={role} activePath="/payments">
      {successMessage && (
        <ErrorFeedback message={successMessage} type="success" visible />
      )}
      {recordMutation.isError && (
        <ErrorFeedback
          message={recordMutation.error?.message || t('payments.recordError')}
          type="error"
          visible
        />
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <a
          href="/payments"
          style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: '44px',
          }}
        >
          ← {t('common.back')}
        </a>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111827',
            marginTop: '0.5rem',
          }}
        >
          {t('payments.recordPayment')}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: '600px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Bill Selection */}
        <div>
          <label
            htmlFor="billId"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '0.375rem',
            }}
          >
            {t('payments.selectBill')} *
          </label>
          <select
            id="billId"
            value={billId}
            onChange={(e) => setBillId(e.target.value)}
            disabled={billsLoading}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '1rem',
              borderRadius: '0.375rem',
              border: `1px solid ${errors.billId ? '#ef4444' : '#d1d5db'}`,
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              minHeight: '44px',
            }}
          >
            <option value="">{t('payments.selectBillPlaceholder')}</option>
            {(billsData?.data || []).map((bill) => (
              <option key={bill.id} value={bill.id}>
                {bill.billingMonth} — {bill.renterName} ({bill.flatNumber}) — ৳
                {(Number(bill.totalAmount) - Number(bill.paidAmount)).toFixed(
                  2,
                )}{' '}
                {t('payments.remaining')}
              </option>
            ))}
          </select>
          {errors.billId && (
            <p
              style={{
                color: '#ef4444',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
              }}
            >
              {errors.billId}
            </p>
          )}
          {remainingBalance !== null && (
            <p
              style={{
                color: '#6b7280',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
              }}
            >
              {t('payments.maxPayable')}: ৳{remainingBalance.toFixed(2)}
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label
            htmlFor="amount"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '0.375rem',
            }}
          >
            {t('payments.amount')} (৳) *
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            max="999999999.99"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '1rem',
              borderRadius: '0.375rem',
              border: `1px solid ${errors.amount ? '#ef4444' : '#d1d5db'}`,
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              minHeight: '44px',
            }}
          />
          {errors.amount && (
            <p
              style={{
                color: '#ef4444',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
              }}
            >
              {errors.amount}
            </p>
          )}
        </div>

        {/* Payment Date */}
        <div>
          <label
            htmlFor="paymentDate"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '0.375rem',
            }}
          >
            {t('payments.date')} *
          </label>
          <input
            id="paymentDate"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '1rem',
              borderRadius: '0.375rem',
              border: `1px solid ${errors.paymentDate ? '#ef4444' : '#d1d5db'}`,
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              minHeight: '44px',
            }}
          />
          {errors.paymentDate && (
            <p
              style={{
                color: '#ef4444',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
              }}
            >
              {errors.paymentDate}
            </p>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label
            htmlFor="paymentMethod"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '0.375rem',
            }}
          >
            {t('payments.method')} *
          </label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value as PaymentMethod | '')
            }
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '1rem',
              borderRadius: '0.375rem',
              border: `1px solid ${errors.paymentMethod ? '#ef4444' : '#d1d5db'}`,
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              minHeight: '44px',
            }}
          >
            <option value="">{t('payments.selectMethod')}</option>
            <option value="cash">{t('payments.cash')}</option>
            <option value="bank_transfer">{t('payments.bankTransfer')}</option>
            <option value="mobile_banking">
              {t('payments.mobileBanking')}
            </option>
          </select>
          {errors.paymentMethod && (
            <p
              style={{
                color: '#ef4444',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
              }}
            >
              {errors.paymentMethod}
            </p>
          )}
        </div>

        {/* Note (optional) */}
        <div>
          <label
            htmlFor="note"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '0.375rem',
            }}
          >
            {t('payments.note')} ({t('payments.optional')})
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={t('payments.notePlaceholder')}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '1rem',
              borderRadius: '0.375rem',
              border: `1px solid ${errors.note ? '#ef4444' : '#d1d5db'}`,
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              resize: 'vertical',
              minHeight: '80px',
            }}
          />
          <p
            style={{
              color: '#6b7280',
              fontSize: '0.75rem',
              marginTop: '0.25rem',
            }}
          >
            {note.length}/500
          </p>
          {errors.note && (
            <p
              style={{
                color: '#ef4444',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
              }}
            >
              {errors.note}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={recordMutation.isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              padding: '0.625rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: '0.5rem',
              backgroundColor: recordMutation.isPending ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              cursor: recordMutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {recordMutation.isPending
              ? t('common.loading')
              : t('payments.recordPayment')}
          </button>
          <a
            href="/payments"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              padding: '0.625rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 500,
              borderRadius: '0.5rem',
              backgroundColor: 'transparent',
              color: '#374151',
              border: '1px solid #d1d5db',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </a>
        </div>
      </form>
    </DashboardLayout>
  )
}
