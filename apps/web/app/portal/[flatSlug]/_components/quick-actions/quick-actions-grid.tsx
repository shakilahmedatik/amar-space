'use client'

import { AlertTriangle, Phone, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { BuildingInfo } from '../portal/sub-components/building-info'

interface QuickActionsGridProps {
  whatsappGroupLink: string | null
  managerPhone: string | null
  flatSlug: string
  rules?: string | null
}

export function QuickActionsGrid({
  managerPhone,
  rules,
}: QuickActionsGridProps) {
  const { t } = useTranslation()
  const [rulesOpen, setRulesOpen] = useState(false)

  if (!rules && !managerPhone) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {rules && (
          <button
            type="button"
            onClick={() => setRulesOpen((prev) => !prev)}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center transition-all min-h-22.5 min-h-12 min-w-[48px] cursor-pointer',
              rulesOpen
                ? 'border-brand-blue-deep bg-brand-blue-deep text-white shadow-md scale-[0.99]'
                : 'border-hairline bg-white shadow-sm hover:border-brand-blue-deep hover:shadow active:scale-[0.99]',
            )}
            aria-label="নিয়মাবলী দেখুন"
            aria-expanded={rulesOpen}
          >
            {rulesOpen ? (
              <X className="h-6 w-6 text-white" aria-hidden />
            ) : (
              <AlertTriangle
                className="h-6 w-6 text-brand-blue-deep"
                aria-hidden
              />
            )}
            <span
              className={cn(
                'text-sm font-semibold',
                rulesOpen ? 'text-white' : 'text-ink',
              )}
            >
              {t('buildings.buildingRules') || 'নিয়মাবলী'}
            </span>
          </button>
        )}

        {managerPhone && (
          <a
            href={`tel:${managerPhone}`}
            className="flex min-h-22.5 min-h-12 min-w-[48px] flex-col items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-4 text-center shadow-sm transition-all hover:border-brand-blue-deep hover:shadow active:scale-[0.98]"
            aria-label="ম্যানেজারকে কল করুন"
            rel="noopener"
          >
            <Phone className="h-6 w-6 text-brand-blue-deep" aria-hidden />
            <span className="text-sm font-semibold text-ink">
              {t('buildings.managerPhone') || 'ম্যানেজারকে কল করুন'}
            </span>
          </a>
        )}
      </div>

      {rulesOpen && rules && (
        <div className="bg-canvas border border-hairline p-5 rounded-xl shadow-sm">
          <BuildingInfo rules={rules} />
        </div>
      )}
    </div>
  )
}
