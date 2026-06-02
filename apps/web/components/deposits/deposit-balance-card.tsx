'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { useTranslation } from '@/lib/i18n'

interface DepositBalanceCardProps {
  securityDepositAmount: number
  remainingBalance: number
}

/**
 * Displays the deposit balance prominently on the renter detail page.
 * Visible without scrolling/navigation to sub-page.
 */
export function DepositBalanceCard({
  securityDepositAmount,
  remainingBalance,
}: DepositBalanceCardProps) {
  const { t } = useTranslation()

  return (
    <Card className="bg-surface rounded-lg border border-hairline mb-6">
      <CardContent className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-steel text-sm font-medium block mb-1">
              {t('deposits.remainingBalance')}
            </span>
            <CurrencyDisplay amount={remainingBalance} large />
          </div>
          <div className="text-right">
            <span className="text-steel text-sm block mb-1">
              {t('deposits.securityDeposit')}
            </span>
            <CurrencyDisplay amount={securityDepositAmount} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
