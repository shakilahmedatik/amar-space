'use client'

import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'

/**
 * Hero section — above the fold.
 * Warm, trustworthy, operational. Green accent on key word.
 * Subtle grid background + floating stat cards for depth.
 */
export function LandingHero() {
  const { t } = useTranslation()

  return (
    <section
      className="relative min-h-svh flex flex-col items-center justify-center pt-24 pb-16 px-4 md:px-8 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(to bottom, transparent 60%, #f7f8fa 100%),
            linear-gradient(rgba(229,231,235,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(229,231,235,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px',
        }}
      />

      {/* Soft green glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse, rgba(27,166,115,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-hairline bg-canvas text-sm font-medium text-slate shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <span
            className="w-2 h-2 rounded-full bg-brand-green animate-pulse"
            aria-hidden="true"
          />
          {t('landing.hero.badge')}
        </div>

        {/* Headline */}
        <h1
          id="hero-heading"
          className="text-4xl md:text-6xl font-bold text-ink leading-[1.1] tracking-tight"
          style={{ letterSpacing: '-1.5px' }}
        >
          {t('landing.hero.headline1')}{' '}
          <span className="text-brand-green">
            {t('landing.hero.headlineAccent')}
          </span>
          <br />
          {t('landing.hero.headline2')}
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-slate max-w-2xl leading-relaxed">
          {t('landing.hero.subheadline')}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href="/register"
            className="px-8 py-3.5 rounded-full text-base font-semibold bg-primary text-on-primary hover:bg-charcoal transition-colors duration-150 min-h-[48px] flex items-center shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
          >
            {t('landing.hero.ctaPrimary')}
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-3.5 rounded-full text-base font-semibold text-ink border border-hairline hover:bg-surface transition-colors duration-150 min-h-[48px] flex items-center"
          >
            {t('landing.hero.ctaSecondary')}
          </a>
        </div>

        {/* Trust line */}
        <p className="text-sm text-stone mt-1">{t('landing.hero.trustLine')}</p>
      </div>

      {/* Floating stat cards */}
      <div className="relative z-10 mt-16 w-full max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-0">
        {[
          {
            value: '৳ ১২,০০০',
            label: t('landing.hero.stat1Label'),
            color: 'text-brand-green',
          },
          {
            value: '৪৮ ঘণ্টা',
            label: t('landing.hero.stat2Label'),
            color: 'text-brand-blue-deep',
          },
          {
            value: '১০০%',
            label: t('landing.hero.stat3Label'),
            color: 'text-ink',
          },
          {
            value: '২৪/৭',
            label: t('landing.hero.stat4Label'),
            color: 'text-brand-orange',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-canvas rounded-xl border border-hairline p-4 md:p-5 flex flex-col gap-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.08)] transition-shadow duration-200"
          >
            <span
              className={`text-2xl md:text-3xl font-bold leading-none ${stat.color}`}
            >
              {stat.value}
            </span>
            <span className="text-xs md:text-sm text-steel leading-snug">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
