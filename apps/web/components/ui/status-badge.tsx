'use client'

import { useTranslation } from '@/lib/i18n'

type StatusVariant =
  | 'vacant'
  | 'occupied'
  | 'under_maintenance'
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'active'
  | 'terminated'
  | 'expired'

interface StatusBadgeProps {
  status: StatusVariant | string
  label?: string
  className?: string
}

/**
 * Color-coded status indicator badge.
 * Validates: Requirement 16.5
 */
export function StatusBadge({
  status,
  label,
  className = '',
}: StatusBadgeProps) {
  const { t } = useTranslation()
  const config = getStatusConfig(status)
  const displayLabel = label || getStatusLabel(status, t)

  return (
    <span
      className={className}
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.625rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        lineHeight: '1rem',
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '0.5rem',
          height: '0.5rem',
          borderRadius: '50%',
          backgroundColor: config.dot,
        }}
      />
      {displayLabel}
    </span>
  )
}
