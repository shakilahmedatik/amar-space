'use client'

import { formatDate } from '@repo/shared'

interface DateDisplayProps {
  /** Date to display (Date object or ISO string) */
  date: Date | string
  /** Additional CSS class name */
  className?: string
}

/**
 * Displays a date in DD/MM/YYYY format following Bangla locale convention.
 * Uses the shared formatDate utility for consistent formatting.
 */
export function DateDisplay({ date, className = '' }: DateDisplayProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const formatted = formatDate(dateObj)

  if (!formatted) {
    return <span className={className}>—</span>
  }

  return (
    <time
      className={['text-steel text-sm tabular-nums', className]
        .filter(Boolean)
        .join(' ')}
      dateTime={dateObj.toISOString()}
    >
      {formatted}
    </time>
  )
}
