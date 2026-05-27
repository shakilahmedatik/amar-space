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

function getStatusConfig(status: string) {
  switch (status) {
    case 'vacant':
    case 'paid':
    case 'resolved':
    case 'active':
      return {
        bg: '#dcfce7',
        text: '#166534',
        border: '#bbf7d0',
        dot: '#16a34a',
      }
    case 'occupied':
    case 'in_progress':
      return {
        bg: '#dbeafe',
        text: '#1e40af',
        border: '#bfdbfe',
        dot: '#2563eb',
      }
    case 'under_maintenance':
    case 'partially_paid':
    case 'open':
      return {
        bg: '#fef3c7',
        text: '#92400e',
        border: '#fde68a',
        dot: '#d97706',
      }
    case 'overdue':
    case 'unpaid':
    case 'terminated':
    case 'expired':
      return {
        bg: '#fee2e2',
        text: '#991b1b',
        border: '#fecaca',
        dot: '#dc2626',
      }
    default:
      return {
        bg: '#f3f4f6',
        text: '#374151',
        border: '#e5e7eb',
        dot: '#6b7280',
      }
  }
}

function getStatusLabel(status: string, t: (key: string) => string): string {
  const labelMap: Record<string, string> = {
    vacant: t('flats.vacant'),
    occupied: t('flats.occupied'),
    under_maintenance: t('flats.underMaintenance'),
    unpaid: t('bills.unpaid'),
    partially_paid: t('bills.partiallyPaid'),
    paid: t('bills.paid'),
    overdue: t('bills.overdue'),
    open: t('maintenance.statusOpen'),
    in_progress: t('maintenance.statusInProgress'),
    resolved: t('maintenance.statusResolved'),
    closed: t('maintenance.statusClosed'),
    active: 'Active',
    terminated: 'Terminated',
    expired: 'Expired',
  }
  return labelMap[status] || status
}
