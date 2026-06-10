'use client'

import { Building2 } from 'lucide-react'
import Image from 'next/image'
import { StatusBadge } from '@/components/ui/status-badge'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

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

export function truncateBuildingName(name: string): string {
  if (name.length <= MAX_BUILDING_NAME_LENGTH) {
    return name
  }
  return `${name.slice(0, MAX_BUILDING_NAME_LENGTH)}…`
}

export function PortalHeader({ building, flat, className }: PortalHeaderProps) {
  const { t } = useTranslation()
  const fallbackText = t('common.notProvided') || 'তথ্য পাওয়া যায়নি'

  const displayName = building.name
    ? truncateBuildingName(building.name)
    : fallbackText

  const displayFlatNumber = flat.flatNumber || fallbackText

  return (
    <section
      aria-label="ফ্ল্যাট তথ্য"
      className={cn('flex flex-col gap-4', className)}
    >
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

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {building.logoUrl ? (
            <div className="relative h-16 w-30 shrink-0 overflow-hidden rounded-md">
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

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1
              className="text-lg font-bold leading-tight text-ink"
              title={building.name || undefined}
            >
              {displayName}
            </h1>
            <p className="text-base text-steel">
              {t('nav.flats') || 'ফ্ল্যাট'}: {displayFlatNumber}
            </p>
          </div>
        </div>
        <StatusBadge status={flat.status} />
      </div>
    </section>
  )
}
