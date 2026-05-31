import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'আমারস্পেস - ফ্ল্যাট পোর্টাল',
  description: 'ফ্ল্যাটের তথ্য, নোটিশ, জরুরি যোগাযোগ এবং ভাড়াটিয়া নিবন্ধন পোর্টাল',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

/**
 * Portal layout — minimal shell without auth sidebar.
 * Bangla-first, mobile-optimized for the public QR portal at /f/[flatSlug].
 *
 * Accessibility:
 * - Minimum 16px base font size (Requirement 10.1)
 * - 48x48px touch targets with 8px spacing (Requirement 10.2)
 * - No horizontal scrolling on 360px–768px viewports (Requirement 10.6)
 * - Pinch-to-zoom up to 200% without layout breakage (Requirement 10.9)
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="portal-root min-h-dvh bg-canvas font-[family-name:var(--font-noto-sans-bengali),var(--font-dm-sans),sans-serif] text-base text-ink antialiased">
      <div className="mx-auto w-full max-w-md px-4 py-6">{children}</div>
    </main>
  )
}
