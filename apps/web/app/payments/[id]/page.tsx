'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { usePaymentReceipt } from '@/hooks/use-payments'
import type { PaymentMethod } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Payment receipt display page — /payments/[id]
 * Shows payment receipt with unique alphanumeric reference (12-20 chars).
 * Validates: Requirements 8.8
 */
export default function PaymentReceiptPage() {
  const { t } = useTranslation()
  const params = useParams()
  const paymentId = params.id as string
  const [role, setRole] = useState<UserRole>('owner')
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
        setRole(session.role as UserRole)
      } catch {
        window.location.href = '/login'
      } finally {
        setIsLoadingSession(false)
      }
    }
    loadSession()
  }, [])

  const { data: receipt, isLoading, error } = usePaymentReceipt(paymentId)

  if (isLoadingSession || isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
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
    <DashboardLayout role={role} activePath="/payments">
      {error && (
        <ErrorFeedback
          message={error.message || t('common.error')}
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
          {t('payments.receiptTitle')}
        </h1>
      </div>

      {receipt && (
        <div
          style={{
            maxWidth: '600px',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            backgroundColor: '#ffffff',
          }}
        >
          {/* Receipt Header */}
          <div
            style={{
              textAlign: 'center',
              borderBottom: '2px dashed #e5e7eb',
              paddingBottom: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#111827',
                marginBottom: '0.25rem',
              }}
            >
              {t('payments.paymentReceipt')}
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
              }}
            >
              {t('common.appName')}
            </p>
          </div>

          {/* Receipt Reference */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: '1.25rem',
              padding: '0.75rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '0.5rem',
              border: '1px solid #bbf7d0',
            }}
          >
            <p
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginBottom: '0.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t('payments.referenceNumber')}
            </p>
            <p
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#166534',
                fontFamily: 'monospace',
                letterSpacing: '0.1em',
              }}
            >
              {receipt.receiptReference}
            </p>
          </div>

          {/* Receipt Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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

            <div
              style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '0.75rem',
                marginTop: '0.25rem',
              }}
            >
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
              <div
                style={{
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '0.75rem',
                  marginTop: '0.25rem',
                }}
              >
                <ReceiptRow label={t('payments.note')} value={receipt.note} />
              </div>
            )}
          </div>

          {/* Receipt Footer */}
          <div
            style={{
              textAlign: 'center',
              borderTop: '2px dashed #e5e7eb',
              paddingTop: '1rem',
              marginTop: '1.25rem',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {t('payments.receiptGenerated')}: {new Date(receipt.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
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
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.25rem 0',
      }}
    >
      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{label}</span>
      <span
        style={{
          fontSize: highlight ? '1.125rem' : '0.875rem',
          fontWeight: highlight ? 700 : 500,
          color: highlight ? '#111827' : '#374151',
        }}
      >
        {value}
      </span>
    </div>
  )
}
