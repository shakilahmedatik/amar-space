'use client'

import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

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
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'MAINTENANCE'

interface StatusBadgeProps {
  status: StatusVariant | string
  label?: string
  className?: string
}

/**
 * Color-coded status indicator badge built on shadcn Badge.
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const { t } = useTranslation()
  const { colorClasses, dotClass } = getStatusConfig(status)
  const displayLabel = label || getStatusLabel(status, t)

  return (
    <Badge
      className={cn(
        'rounded-full px-[10px] py-1 border-transparent font-semibold text-xs gap-1.5',
        colorClasses,
        className,
      )}
      role="status"
    >
      <span
        aria-hidden="true"
        className={cn('w-2 h-2 rounded-full shrink-0', dotClass)}
      />
      {displayLabel}
    </Badge>
  )
}

function getStatusConfig(status: string): {
  colorClasses: string
  dotClass: string
} {
  switch (status) {
    case 'vacant':
    case 'paid':
    case 'resolved':
    case 'active':
      return {
        colorClasses: 'bg-success-bg text-success-text',
        dotClass: 'bg-success-text',
      }
    case 'occupied':
    case 'in_progress':
      return {
        colorClasses: 'bg-brand-blue-200 text-brand-blue-deep',
        dotClass: 'bg-brand-blue-deep',
      }
    case 'under_maintenance':
    case 'partially_paid':
    case 'open':
      return {
        colorClasses: 'bg-warning-bg text-warning-text',
        dotClass: 'bg-warning-text',
      }
    case 'overdue':
    case 'unpaid':
    case 'terminated':
    case 'expired':
      return {
        colorClasses: 'bg-error-bg text-error-text',
        dotClass: 'bg-error-text',
      }
    case 'AVAILABLE':
      return {
        colorClasses: 'bg-success-bg text-success-text',
        dotClass: 'bg-success-text',
      }
    case 'OCCUPIED':
      return {
        colorClasses: 'bg-brand-blue-200 text-brand-blue-deep',
        dotClass: 'bg-brand-blue-deep',
      }
    case 'MAINTENANCE':
      return {
        colorClasses: 'bg-warning-bg text-warning-text',
        dotClass: 'bg-warning-text',
      }
    default:
      return {
        colorClasses: 'bg-surface text-steel',
        dotClass: 'bg-steel',
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
    AVAILABLE: t('flats.vacant'),
    OCCUPIED: t('flats.occupied'),
    MAINTENANCE: t('flats.underMaintenance'),
  }
  return labelMap[status] || status
}
