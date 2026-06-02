'use client'

import { MessageCircle, Phone } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'

interface QuickActionsGridProps {
  whatsappGroupLink: string | null
  managerPhone: string | null
  flatSlug: string
}

/**
 * Quick actions grid — communication shortcuts for the portal.
 *
 * Renders touch-friendly action cards for:
 * - WhatsApp Group (conditional: only when configured)
 * - Call Manager (conditional: only when configured)
 *
 * All buttons meet the 48×48px minimum touch target requirement.
 * Tracks "WhatsApp Clicked" analytics event on WhatsApp button tap.
 */
export function QuickActionsGrid({
  whatsappGroupLink,
  managerPhone,
  flatSlug,
}: QuickActionsGridProps) {
  function handleWhatsAppClick() {
    trackEvent('WhatsApp Clicked', flatSlug)
  }

  // If neither link is configured, don't render anything
  if (!whatsappGroupLink && !managerPhone) {
    return null
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {whatsappGroupLink && (
        <a
          href={whatsappGroupLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="flex min-h-[72px] min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-4 text-center shadow-sm transition-all hover:border-green-300 hover:shadow active:scale-[0.98]"
          aria-label="হোয়াটসঅ্যাপ গ্রুপে যোগ দিন"
        >
          <MessageCircle className="h-6 w-6 text-green-600" aria-hidden />
          <span className="text-sm font-semibold text-ink">হোয়াটসঅ্যাপ গ্রুপ</span>
        </a>
      )}

      {managerPhone && (
        <a
          href={`tel:${managerPhone}`}
          className="flex min-h-[72px] min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-4 text-center shadow-sm transition-all hover:border-brand-blue-deep/40 hover:shadow active:scale-[0.98]"
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
  )
}
