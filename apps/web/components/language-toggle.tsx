'use client'

import { useTranslation, type Locale } from '@/lib/i18n'

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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        borderRadius: '0.375rem',
        border: '1px solid #d1d5db',
        padding: '0.5rem 0.75rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
        background: 'transparent',
        color: 'inherit',
        minWidth: '44px',
        minHeight: '44px',
        transition: 'background-color 0.15s',
      }}
    >
      <span aria-hidden="true">🌐</span>
      <span>{locale === 'bn' ? t('common.english') : t('common.bangla')}</span>
    </button>
  )
}
