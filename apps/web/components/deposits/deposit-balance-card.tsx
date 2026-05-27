'use client'

import { CurrencyDisplay } from '@/components/ui/currency-display'
import { useTranslation } from '@/lib/i18n'

interface DepositBalanceCardProps {
  securityDepositAmount: number
  remainingBalance: number
}

/**
 * Displays the deposit balance prominently on the renter detail page.
 * Visible without scrolling/navigation to sub-page.
 * Validates: Requirements 9.12
 */
export function DepositBalanceCard({
  securityDepositAmount,
  remainingBalance,
}: DepositBalanceCardProps) {
  const { t } = useTranslation()

  return (
    <div
      style={{
        padding: '1.25rem 1.5rem',
        borderRadius: '0.5rem',
        border: '1px solid #bbf7d0',
        backgroundColor: '#f0fdf4',
        marginBottom: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#166534',
              display: 'block',
              marginBottom: '0.25rem',
            }}
          >
            {t('deposits.remainingBalance')}
          </span>
          <CurrencyDisplay amount={remainingBalance} large />
        </div>
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              display: 'block',
              marginBottom: '0.25rem',
            }}
          >
            {t('deposits.securityDeposit')}
          </span>
          <CurrencyDisplay amount={securityDepositAmount} />
        </div>
      </div>
    </div>
  )
}
