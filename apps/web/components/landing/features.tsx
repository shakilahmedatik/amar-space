'use client'

import { useTranslation } from '@/lib/i18n'

const featureIcons = {
  building: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 19V13h6v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 8h2M13 8h2M7 11h2M13 11h2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M11 4V2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  payment: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="5"
        width="18"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M2 9h18" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6 13h4M14 13h2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  tenant: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="11" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4 19c0-3.866 3.134-7 7-7h0c3.866 0 7 3.134 7 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  audit: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 2h10a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 7h6M8 11h6M8 15h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  notice: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 3L3 8v1h16V8L11 3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M5 9v8M17 9v8M3 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="11" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  mobile: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="2"
        width="10"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="11" cy="17" r="1" fill="currentColor" />
      <path
        d="M9 5h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
}

/**
 * Features section — 6-card grid showcasing core capabilities.
 */
export function LandingFeatures() {
  const { t } = useTranslation()

  const features = [
    {
      icon: featureIcons.building,
      title: t('landing.features.f1Title'),
      desc: t('landing.features.f1Desc'),
      accent: 'bg-brand-green-light text-brand-green',
    },
    {
      icon: featureIcons.payment,
      title: t('landing.features.f2Title'),
      desc: t('landing.features.f2Desc'),
      accent: 'bg-brand-blue-200 text-brand-blue-deep',
    },
    {
      icon: featureIcons.tenant,
      title: t('landing.features.f3Title'),
      desc: t('landing.features.f3Desc'),
      accent: 'bg-warning-bg text-warning-text',
    },
    {
      icon: featureIcons.audit,
      title: t('landing.features.f4Title'),
      desc: t('landing.features.f4Desc'),
      accent: 'bg-surface text-steel',
    },
    {
      icon: featureIcons.notice,
      title: t('landing.features.f5Title'),
      desc: t('landing.features.f5Desc'),
      accent: 'bg-error-bg text-error-text',
    },
    {
      icon: featureIcons.mobile,
      title: t('landing.features.f6Title'),
      desc: t('landing.features.f6Desc'),
      accent: 'bg-brand-green-light text-brand-green',
    },
  ]

  return (
    <section
      id="features"
      className="py-20 md:py-28 px-4 md:px-8 bg-surface"
      aria-labelledby="features-heading"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-sm font-semibold text-brand-green uppercase tracking-widest">
            {t('landing.features.eyebrow')}
          </span>
          <h2
            id="features-heading"
            className="mt-3 text-3xl md:text-4xl font-bold text-ink tracking-[-0.5px]"
          >
            {t('landing.features.heading')}
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate max-w-xl mx-auto leading-relaxed">
            {t('landing.features.subheading')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-canvas rounded-xl border border-hairline p-6 flex flex-col gap-4 hover:shadow-[0_4px_8px_rgba(0,0,0,0.06)] transition-shadow duration-200 group"
            >
              <div
                className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${f.accent}`}
              >
                {f.icon}
              </div>
              <div>
                <h3 className="text-base font-semibold text-ink mb-1.5">
                  {f.title}
                </h3>
                <p className="text-sm text-slate leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
