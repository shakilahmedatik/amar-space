'use client'

import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'

/**
 * Landing page footer — dark background, minimal links.
 */
export function LandingFooter() {
  const { t } = useTranslation()

  return (
    <footer
      className="bg-footer-bg text-on-dark px-4 md:px-8 py-12"
      role="contentinfo"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          {/* Brand */}
          <div className="flex flex-col gap-3 max-w-xs">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.1)] flex items-center justify-center shrink-0">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="2"
                    y="2"
                    width="6"
                    height="6"
                    rx="1.5"
                    fill="white"
                  />
                  <rect
                    x="10"
                    y="2"
                    width="6"
                    height="6"
                    rx="1.5"
                    fill="white"
                    opacity="0.5"
                  />
                  <rect
                    x="2"
                    y="10"
                    width="6"
                    height="6"
                    rx="1.5"
                    fill="white"
                    opacity="0.5"
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
              <span className="font-bold text-lg text-on-primary">আমারস্পেস</span>
            </Link>
            <p className="text-sm text-muted leading-relaxed">
              {t('landing.footer.tagline')}
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone mb-4">
                {t('landing.footer.product')}
              </p>
              <ul className="flex flex-col gap-2.5">
                {[
                  { label: t('landing.nav.features'), href: '#features' },
                  { label: t('landing.nav.howItWorks'), href: '#how-it-works' },
                  { label: t('landing.nav.pricing'), href: '#pricing' },
                ].map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="text-sm text-muted hover:text-on-primary transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone mb-4">
                {t('landing.footer.account')}
              </p>
              <ul className="flex flex-col gap-2.5">
                {[
                  { label: t('auth.login'), href: '/login' },
                  { label: t('auth.register'), href: '/register' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted hover:text-on-primary transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone mb-4">
                {t('landing.footer.legal')}
              </p>
              <ul className="flex flex-col gap-2.5">
                {[
                  { label: t('landing.footer.privacy'), href: '/privacy' },
                  { label: t('landing.footer.terms'), href: '/terms' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted hover:text-on-primary transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-stone">
            {t('landing.footer.copyright', {
              year: new Date().getFullYear().toString(),
            })}
          </p>
          <p className="text-xs text-stone">{t('landing.footer.madeIn')}</p>
        </div>
      </div>
    </footer>
  )
}
