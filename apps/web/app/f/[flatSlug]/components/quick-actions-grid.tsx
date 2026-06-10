'use client'

import { AlertTriangle, Phone, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BuildingInfo } from './building-info'

interface QuickActionsGridProps {
  whatsappGroupLink: string | null
  managerPhone: string | null
  flatSlug: string
  rules?: string | null
}

/**
 * Quick actions grid — communication shortcuts for the portal.
 *
 * Renders touch-friendly action cards for:
 * - Rules (conditional: only when building rules are configured)
 * - Call Manager (conditional: only when configured)
 *
 * All buttons meet the 48×48px minimum touch target requirement.
 */
export function QuickActionsGrid({
  managerPhone,
  rules,
}: QuickActionsGridProps) {
  const [rulesOpen, setRulesOpen] = useState(false)

  // If neither link is configured, don't render anything
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
              'flex flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center transition-all min-h-[90px] cursor-pointer',
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
              {'নিয়মাবলী'}
            </span>
          </button>
        )}

        {managerPhone && (
          <a
            href={`tel:${managerPhone}`}
            className="flex min-h-[72px] min-w-[48px] flex-col items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-4 text-center shadow-sm transition-all hover:border-brand-blue-deep/40 hover:shadow active:scale-[0.98]"
            aria-label="ম্যানেজারকে কল করুন"
            rel="noopener"
          >
            <Phone className="h-6 w-6 text-brand-blue-deep" aria-hidden />
            <span className="text-sm font-semibold text-ink">
              ম্যানেজারকে কল করুন
            </span>
          </a>
        )}
      </div>

      {/* Rules panel — expands below the grid when the Rules button is clicked */}
      {rulesOpen && rules && (
        <div className="bg-canvas border border-hairline p-5 rounded-xl shadow-sm">
          <BuildingInfo rules={rules} />
        </div>
      )}
    </div>
  )
}
