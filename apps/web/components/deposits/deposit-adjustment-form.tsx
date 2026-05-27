'use client'

import { type FormEvent, useCallback, useState } from 'react'
import { FormField, FormInput } from '@/components/ui/form-field'
import {
  useApplyAdjustment,
  useUnpaidBillsForContract,
} from '@/hooks/use-deposits'
import { useTranslation } from '@/lib/i18n'

interface DepositAdjustmentFormProps {
  contractId: string
  remainingBalance: number
  onSuccess?: () => void
}

/**
 * Adjustment form (Owner only) with amount, optional bill link, and note.
 * Amount must be min 0.01 and must not exceed remaining balance.
 * Note max 500 chars.
 * Validates: Requirements 9.7, 9.8, 9.9
 */
export function DepositAdjustmentForm({
  contractId,
  remainingBalance,
  onSuccess,
}: DepositAdjustmentFormProps) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState('')
  const [billId, setBillId] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const { data: billsData } = useUnpaidBillsForContract(contractId)
  const adjustMutation = useApplyAdjustment(contractId)

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    const amountNum = Number.parseFloat(amount)
    if (!amount || Number.isNaN(amountNum)) {
      newErrors.amount = t('deposits.amountRequired')
    } else if (amountNum < 0.01) {
      newErrors.amount = t('deposits.amountMin')
    } else if (amountNum > remainingBalance) {
      newErrors.amount = t('deposits.amountExceedsBalance')
    }

    if (note.length > 500) {
      newErrors.note = t('deposits.noteMaxLength')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [amount, note, remainingBalance, t])

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      setSuccessMessage('')

      if (!validate()) return

      const data: { amount: number; billId?: string; note?: string } = {
        amount: Number.parseFloat(amount),
      }
      if (billId) data.billId = billId
      if (note.trim()) data.note = note.trim()

      adjustMutation.mutate(data, {
        onSuccess: () => {
          setAmount('')
          setBillId('')
          setNote('')
          setErrors({})
          setSuccessMessage(t('deposits.adjustSuccess'))
          onSuccess?.()
        },
        onError: (err) => {
          setErrors({ form: err.message || t('deposits.adjustError') })
        },
      })
    },
    [amount, billId, note, validate, adjustMutation, t, onSuccess],
  )

  const unpaidBills = billsData?.data || []

  return (
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
        {t('deposits.applyAdjustment')}
      </h2>

      {successMessage && (
        <div
          role="status"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {successMessage}
        </div>
      )}

      {errors.form && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormField
          label={t('deposits.amount')}
          error={errors.amount}
          required
          htmlFor="adjustment-amount"
        >
          <FormInput
            id="adjustment-amount"
            type="number"
            step="0.01"
            min="0.01"
            max={remainingBalance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            hasError={!!errors.amount}
            placeholder="0.00"
            aria-describedby={
              errors.amount ? 'adjustment-amount-error' : undefined
            }
          />
        </FormField>

        <FormField label={t('deposits.billLink')} htmlFor="adjustment-bill">
          <select
            id="adjustment-bill"
            value={billId}
            onChange={(e) => setBillId(e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '1rem',
              lineHeight: '1.5',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              minHeight: '44px',
            }}
          >
            <option value="">{t('deposits.noBillLink')}</option>
            {unpaidBills.map((bill) => (
              <option key={bill.id} value={bill.id}>
                {bill.billingMonth} — {t('deposits.outstanding')}: ৳
                {bill.outstanding.toFixed(2)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t('deposits.note')}
          error={errors.note}
          htmlFor="adjustment-note"
        >
          <textarea
            id="adjustment-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={t('deposits.notePlaceholder')}
            rows={3}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '1rem',
              lineHeight: '1.5',
              borderRadius: '0.375rem',
              border: `1px solid ${errors.note ? '#dc2626' : '#d1d5db'}`,
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              resize: 'vertical',
              minHeight: '80px',
            }}
            aria-invalid={!!errors.note || undefined}
          />
        </FormField>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={adjustMutation.isPending}
            style={{
              minWidth: '44px',
              minHeight: '44px',
              padding: '0.625rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 500,
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: adjustMutation.isPending ? '#9ca3af' : '#2563eb',
              color: '#ffffff',
              cursor: adjustMutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {adjustMutation.isPending
              ? t('common.loading')
              : t('deposits.applyAdjustment')}
          </button>
        </div>
      </form>
    </div>
  )
}
