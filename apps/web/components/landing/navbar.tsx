'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LanguageToggle } from '@/components/language-toggle'
import { useTranslation } from '@/lib/i18n'

/**
 * Landing page navbar — sticky, transparent-to-white on scroll.
 * Mobile: hamburger menu with slide-down drawer.
 * Desktop: inline nav links + CTA.
 */
export function LandingNavbar() {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const navLinks = [
    { label: t('landing.nav.features'), href: '#features' },
    { label: t('landing.nav.howItWorks'), href: '#how-it-works' },
    { label: t('landing.nav.pricing'), href: '#pricing' },
  ]

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-canvas/95 backdrop-blur-md border-b border-hairline shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
          : 'bg-transparent',
      ].join(' ')}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="6" height="6" rx="1.5" fill="white" />
              <rect
                x="10"
                y="2"
                width="6"
                height="6"
                rx="1.5"
                fill="white"
                opacity="0.6"
              />
              <rect
                x="2"
                y="10"
                width="6"
                height="6"
                rx="1.5"
                fill="white"
                opacity="0.6"
              />
              <rect
                x="10"
                y="10"
                width="6"
                height="6"
                rx="1.5"
                fill="var(--color-brand-green)"
              />
            </svg>
          </span>
          <span className="font-bold text-lg text-ink tracking-tight leading-none">
            আমারস্পেস
          </span>
        </Link>

        {/* Desktop nav — hash anchors stay as <a> */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Primary navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 rounded-full text-sm font-medium text-slate hover:text-ink hover:bg-surface transition-colors duration-150 min-h-[44px] flex items-center"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageToggle />
          <Link
            href="/login"
            className="px-4 py-2 rounded-full text-sm font-semibold text-ink border border-hairline hover:bg-surface transition-colors duration-150 min-h-[44px] flex items-center"
          >
            {t('auth.login')}
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 rounded-full text-sm font-semibold bg-primary text-on-primary hover:bg-charcoal transition-colors duration-150 min-h-[44px] flex items-center"
          >
            {t('landing.nav.getStarted')}
          </Link>
        </div>

        {/* Mobile: language + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন'}
            aria-expanded={menuOpen}
            className="w-11 h-11 flex items-center justify-center rounded-full border border-hairline bg-canvas text-ink hover:bg-surface transition-colors"
          >
            {menuOpen ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 3L15 15M15 3L3 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 5h14M2 9h14M2 13h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden bg-canvas border-t border-hairline px-4 py-4 flex flex-col gap-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="px-4 py-3 rounded-lg text-base font-medium text-charcoal hover:bg-surface hover:text-ink transition-colors min-h-[44px] flex items-center"
            >
              {link.label}
            </a>
          ))}
          <div className="border-t border-hairline mt-2 pt-3 flex flex-col gap-2">
            <Link
              href="/login"
              className="px-4 py-3 rounded-full text-base font-semibold text-ink border border-hairline hover:bg-surface transition-colors min-h-[44px] flex items-center justify-center"
            >
              {t('auth.login')}
            </Link>
            <Link
              href="/register"
              className="px-4 py-3 rounded-full text-base font-semibold bg-primary text-on-primary hover:bg-charcoal transition-colors min-h-[44px] flex items-center justify-center"
            >
              {t('landing.nav.getStarted')}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
