'use client'

import { AlertTriangle, FileText, MessageCircle, Phone } from 'lucide-react'
import { trackEvent } from '../lib/analytics'

interface QuickActionsGridProps {
  whatsappGroupLink: string | null
  managerPhone: string | null
  flatSlug: string
}

/**
 * Quick actions grid component — renders a 2-column grid of large,
 * touch-friendly action buttons for the portal.
 *
 * - WhatsApp Group button (conditional: only shown if link configured)
 * - Call Manager button (conditional: only shown if phone configured)
 * - Emergency Contacts scroll-to button (always shown)
 * - Notices scroll-to button (always shown)
 *
 * All buttons meet the 48x48px minimum touch target requirement.
 * Tracks "WhatsApp Clicked" analytics event on WhatsApp button tap.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */
export function QuickActionsGrid({
  whatsappGroupLink,
  managerPhone,
  flatSlug,
}: QuickActionsGridProps) {
  function handleWhatsAppClick() {
    trackEvent('WhatsApp Clicked', flatSlug)
  }

  function scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {whatsappGroupLink && (
        <a
          href={whatsappGroupLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-2 rounded-lg border border-hairline bg-white p-4 text-center shadow-sm transition-colors active:bg-surface"
          aria-label="হোয়াটসঅ্যাপ গ্রুপে যোগ দিন"
        >
          <MessageCircle className="h-6 w-6 text-green-600" aria-hidden />
          <span className="text-base font-medium text-ink">
            হোয়াটসঅ্যাপ গ্রুপে যোগ দিন
          </span>
        </a>
      )}

      {managerPhone && (
        <a
          href={`tel:${managerPhone}`}
          className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-2 rounded-lg border border-hairline bg-white p-4 text-center shadow-sm transition-colors active:bg-surface"
          aria-label="ম্যানেজারকে কল করুন"
        >
          <Phone className="h-6 w-6 text-brand-blue-deep" aria-hidden />
          <span className="text-base font-medium text-ink">
            ম্যানেজারকে কল করুন
          </span>
        </a>
      )}

      <button
        type="button"
        onClick={() => scrollToSection('emergency-contacts')}
        className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-2 rounded-lg border border-hairline bg-white p-4 text-center shadow-sm transition-colors active:bg-surface"
        aria-label="জরুরি যোগাযোগ"
      >
        <AlertTriangle className="h-6 w-6 text-warning-text" aria-hidden />
        <span className="text-base font-medium text-ink">জরুরি যোগাযোগ</span>
      </button>

      <button
        type="button"
        onClick={() => scrollToSection('notice-board')}
        className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-2 rounded-lg border border-hairline bg-white p-4 text-center shadow-sm transition-colors active:bg-surface"
        aria-label="নোটিশ"
      >
        <FileText className="h-6 w-6 text-brand-blue-deep" aria-hidden />
        <span className="text-base font-medium text-ink">নোটিশ</span>
      </button>
    </div>
  )
}
