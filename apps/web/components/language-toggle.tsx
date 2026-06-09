'use client'

import { type Locale, useTranslation } from '@/lib/i18n'

/**
 * Language toggle component that switches between Bangla and English.
 * Persists preference to localStorage for unauthenticated users.
 * For authenticated users, the parent should also call the server-side
 * profile update API when the locale changes.
 */
export function LanguageToggle({
  onLocaleChange,
}: {
  /** Optional callback for server-side persistence (authenticated users) */
  onLocaleChange?: (locale: Locale) => void
}) {
  const { locale, setLocale, t } = useTranslation()

  const handleToggle = () => {
    const newLocale: Locale = locale === 'bn' ? 'en' : 'bn'
    setLocale(newLocale)
    onLocaleChange?.(newLocale)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={t('common.language')}
      className="inline-flex items-center gap-2 rounded-md border border-hairline px-3 py-2 text-sm font-medium cursor-pointer bg-transparent text-inherit min-w-[44px] min-h-11 transition-colors hover:bg-surface"
    >
      <span aria-hidden="true">🌐</span>
      <span>{locale === 'bn' ? t('common.english') : t('common.bangla')}</span>
    </button>
  )
}
