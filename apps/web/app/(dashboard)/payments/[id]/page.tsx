'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { usePaymentReceipt } from '@/hooks/use-payments'
import type { PaymentMethod } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'
import { useSession } from '@/contexts/session-context'

/**
 * Payment receipt display page — /payments/[id]
 * Shows payment receipt with unique alphanumeric reference (12-20 chars).
 * Validates: Requirements 8.8
 */
export default function PaymentReceiptPage() {
  const { t } = useTranslation()
  const params = useParams()
  const router = useRouter()
  const paymentId = params.id as string
const { data: receipt, isLoading, error } = usePaymentReceipt(paymentId)

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <div className="w-full max-w-md px-4">
          <LoadingSkeleton rows={8} showHeader />
        </div>
      </div>
    )
  }

  const formatMethod = (method: PaymentMethod): string => {
    switch (method) {
      case 'cash':
        return t('payments.cash')
      case 'bank_transfer':
        return t('payments.bankTransfer')
      case 'mobile_banking':
        return t('payments.mobileBanking')
      default:
        return method
    }
  }

  return (
    <>
      {error && (
        <ErrorFeedback
          message={error.message || t('common.error')}
          type="error"
          visible
        />
      )}

      <div className="mb-6">
        <Link
          href="/payments"
          className="text-steel text-sm no-underline inline-flex items-center min-h-[44px]"
        >
          ← {t('common.back')}
        </Link>
        <h1 className="text-2xl font-bold text-ink mt-2">
          {t('payments.receiptTitle')}
        </h1>
      </div>

      {receipt && (
        <div className="max-w-[600px] border border-hairline rounded-xl p-6 bg-canvas">
          {/* Receipt Header */}
          <div className="text-center border-b-2 border-dashed border-hairline pb-4 mb-5">
            <h2 className="text-lg font-bold text-ink mb-1">
              {t('payments.paymentReceipt')}
            </h2>
            <p className="text-sm text-steel">{t('common.appName')}</p>
          </div>

          {/* Receipt Reference */}
          <div className="text-center mb-5 p-3 bg-success-bg rounded-md border border-success-text/30">
            <p className="text-xs text-steel mb-1 uppercase tracking-wide">
              {t('payments.referenceNumber')}
            </p>
            <p className="text-xl font-bold text-success-text font-mono tracking-widest">
              {receipt.receiptReference}
            </p>
          </div>

          {/* Receipt Details */}
          <div className="flex flex-col gap-3">
            <ReceiptRow
              label={t('payments.amount')}
              value={`৳${Number(receipt.amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              highlight
            />
            <ReceiptRow
              label={t('payments.date')}
              value={receipt.paymentDate}
            />
            <ReceiptRow
              label={t('payments.method')}
              value={formatMethod(receipt.paymentMethod)}
            />
            <ReceiptRow
              label={t('payments.renter')}
              value={receipt.renterName}
            />
            <ReceiptRow
              label={t('payments.flat')}
              value={`${receipt.flatNumber} — ${receipt.buildingName}`}
            />
            <ReceiptRow
              label={t('payments.billMonth')}
              value={receipt.billingMonth}
            />

            <div className="border-t border-hairline pt-3 mt-1">
              <ReceiptRow
                label={t('payments.totalBill')}
                value={`৳${Number(receipt.totalBillAmount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <ReceiptRow
                label={t('payments.totalPaid')}
                value={`৳${Number(receipt.paidAmount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <ReceiptRow
                label={t('payments.remainingBalance')}
                value={`৳${Number(receipt.remainingBalance).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
            </div>

            {receipt.note && (
              <div className="border-t border-hairline pt-3 mt-1">
                <ReceiptRow label={t('payments.note')} value={receipt.note} />
              </div>
            )}
          </div>

          {/* Receipt Footer */}
          <div className="text-center border-t-2 border-dashed border-hairline pt-4 mt-5">
            <p className="text-xs text-muted">
              {t('payments.receiptGenerated')}:{' '}
              {new Date(receipt.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

function ReceiptRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-steel">{label}</span>
      <span
        className={
          highlight
            ? 'text-lg font-bold text-ink'
            : 'text-sm font-medium text-charcoal'
        }
      >
        {value}
      </span>
    </div>
  )
}
