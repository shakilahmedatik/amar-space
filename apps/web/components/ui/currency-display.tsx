'use client'

import { formatBDT } from '@repo/shared'

interface CurrencyDisplayProps {
  amount: number
  className?: string
  large?: boolean
}

/**
 * Displays a monetary amount in BDT with Bangladeshi numbering.
 * Validates: Requirement 15.3
 */
export function CurrencyDisplay({
  amount,
  className = '',
  large = false,
}: CurrencyDisplayProps) {
  const formatted = formatBDT(amount)

  return (
    <span
      className={className}
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontSize: large ? '1.25rem' : 'inherit',
        fontWeight: large ? 600 : 'inherit',
      }}
    >
      {formatted}
    </span>
  )
}
