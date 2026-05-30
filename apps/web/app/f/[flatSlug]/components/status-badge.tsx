import { cn } from '@/lib/utils'

export type FlatStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'

interface PortalStatusBadgeProps {
  status: FlatStatus | string
  className?: string
}

interface StatusConfig {
  label: string
  colorClasses: string
  dotClass: string
}

function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'AVAILABLE':
      return {
        label: 'খালি',
        colorClasses: 'bg-success-bg text-success-text',
        dotClass: 'bg-success-text',
      }
    case 'OCCUPIED':
      return {
        label: 'ভাড়া হয়েছে',
        colorClasses: 'bg-brand-blue-200 text-brand-blue-deep',
        dotClass: 'bg-brand-blue-deep',
      }
    case 'MAINTENANCE':
      return {
        label: 'রক্ষণাবেক্ষণ',
        colorClasses: 'bg-warning-bg text-warning-text',
        dotClass: 'bg-warning-text',
      }
    default:
      return {
        label: 'অজানা',
        colorClasses: 'bg-surface text-steel',
        dotClass: 'bg-steel',
      }
  }
}

/**
 * Portal status badge component for flat availability display.
 * Maps flat status to colored badge with Bangla labels.
 *
 * - AVAILABLE → green "খালি"
 * - OCCUPIED → blue "ভাড়া হয়েছে"
 * - MAINTENANCE → orange "রক্ষণাবেক্ষণ"
 * - unknown → grey "অজানা"
 *
 * Validates: Requirements 2.2, 2.3, 2.4, 2.6
 */
export function PortalStatusBadge({
  status,
  className,
}: PortalStatusBadgeProps) {
  const { label, colorClasses, dotClass } = getStatusConfig(status)

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-semibold',
        colorClasses,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-2 w-2 shrink-0 rounded-full', dotClass)}
      />
      {label}
    </span>
  )
}
