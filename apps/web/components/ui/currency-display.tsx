'use client'

import { formatBDT } from '@repo/shared'

interface CurrencyDisplayProps {
  amount: number
  className?: string
  large?: boolean
}

/**
 * Displays a monetary amount in BDT with Bangladeshi numbering.
 */
export function CurrencyDisplay({
  amount,
  className = '',
  large = false,
}: CurrencyDisplayProps) {
  const formatted = formatBDT(amount)

  return (
    <span
      className={[
        'text-ink font-semibold tabular-nums',
        large ? 'text-xl' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {formatted}
    </span>
  )
}
