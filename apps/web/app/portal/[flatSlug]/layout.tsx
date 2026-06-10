import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { LanguageToggle } from './_components/layout/language-toggle'

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

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="portal-root min-h-dvh bg-canvas font-[family-name:var(--font-noto-sans-bengali),var(--font-dm-sans),sans-serif] text-base text-ink antialiased">
      <div className="mx-auto w-full max-w-md px-4 py-6 pb-24">{children}</div>
      <LanguageToggle />
    </main>
  )
}
