import { Building2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { PortalStatusBadge } from './status-badge'

const PLACEHOLDER_TEXT = 'তথ্য পাওয়া যায়নি'
const MAX_BUILDING_NAME_LENGTH = 100

interface PortalHeaderProps {
  building: {
    name: string
    logoUrl: string | null
    coverImageUrl: string | null
  }
  flat: {
    flatNumber: string
    status: string
  }
  className?: string
}

/**
 * Truncates a building name to the maximum allowed length.
 * Returns the string unchanged if 100 characters or fewer,
 * otherwise returns the first 100 characters followed by an ellipsis.
 *
 * Validates: Requirements 2.1 (Property 2: Building name truncation)
 */
export function truncateBuildingName(name: string): string {
  if (name.length <= MAX_BUILDING_NAME_LENGTH) {
    return name
  }
  return `${name.slice(0, MAX_BUILDING_NAME_LENGTH)}…`
}

/**
 * Portal header component — displays building name, flat number,
 * logo/cover image, and status badge.
 *
 * - Building name is truncated at 100 characters with ellipsis
 * - Missing data shows placeholder text "তথ্য পাওয়া যায়নি"
 * - Logo displayed at max 120px width, cover image at full width
 * - Status badge shows flat availability in Bangla
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */
export function PortalHeader({ building, flat, className }: PortalHeaderProps) {
  const displayName = building.name
    ? truncateBuildingName(building.name)
    : PLACEHOLDER_TEXT

  const displayFlatNumber = flat.flatNumber || PLACEHOLDER_TEXT
  return (
    <section
      aria-label="ফ্ল্যাট তথ্য"
      className={cn('flex flex-col gap-4', className)}
    >
      {/* Cover image — full header width */}
      {building.coverImageUrl && (
        <div className="relative aspect-3/1 w-full overflow-hidden rounded-lg">
          <Image
            src={building.coverImageUrl}
            alt={`${building.name || 'বিল্ডিং'} কভার ছবি`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 448px"
            priority
            unoptimized
          />
        </div>
      )}

      <div className="flex items-center justify-between  gap-2">
        <div className="flex items-center gap-3">
          {/* Logo — max 120px width */}
          {building.logoUrl ? (
            <div className="relative h-16 w-[120px] shrink-0 overflow-hidden rounded-md">
              <Image
                src={building.logoUrl}
                alt={`${building.name || 'বিল্ডিং'} লোগো`}
                fill
                className="object-contain"
                sizes="120px"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-surface">
              <Building2 className="h-8 w-8 text-steel" aria-hidden />
            </div>
          )}

          {/* Building name, flat number, and status badge */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1
              className="text-lg font-bold leading-tight text-ink"
              title={building.name || undefined}
            >
              {displayName}
            </h1>
            <p className="text-base text-steel">ফ্ল্যাট: {displayFlatNumber}</p>
          </div>
        </div>
        <PortalStatusBadge status={flat.status} />
      </div>
    </section>
  )
}
