'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import bn from './translations/bn'
import en from './translations/en'
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  type FlatTranslations,
  type Locale,
  type TranslationDictionary,
} from './types'

const dictionaries: Record<Locale, TranslationDictionary> = { bn, en }

/**
 * Flatten a nested translation dictionary into dot-notation keys.
 * e.g. { common: { save: 'Save' } } → { 'common.save': 'Save' }
 */
function flattenDictionary(
  dict: TranslationDictionary,
  prefix = ''
): FlatTranslations {
  const result: FlatTranslations = {}
  for (const [key, value] of Object.entries(dict)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') {
      result[fullKey] = value
    } else {
      Object.assign(
        result,
        flattenDictionary(value as TranslationDictionary, fullKey)
      )
    }
  }
  return result
}

// Pre-flatten dictionaries for fast lookup
const flatDictionaries: Record<Locale, FlatTranslations> = {
  bn: flattenDictionary(dictionaries.bn),
  en: flattenDictionary(dictionaries.en),
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      return stored as Locale
    }
  } catch {
    // localStorage may be unavailable (e.g., private browsing)
  }
  return DEFAULT_LOCALE
}

interface I18nProviderProps {
  children: ReactNode
  /** Initial locale override (e.g., from server-side user profile) */
  initialLocale?: Locale
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale ?? DEFAULT_LOCALE
  )
  const [isHydrated, setIsHydrated] = useState(false)

  // On mount, read from localStorage if no initialLocale was provided
  useEffect(() => {
    if (!initialLocale) {
      const stored = getStoredLocale()
      setLocaleState(stored)
    }
    setIsHydrated(true)
  }, [initialLocale])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    // Persist to localStorage for unauthenticated users
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, [])

  // Use the default locale for SSR to avoid hydration mismatch
  const activeLocale = isHydrated ? locale : (initialLocale ?? DEFAULT_LOCALE)

  /**
   * Translate a key with optional parameter interpolation.
   * Falls back to English if the key is missing in the active locale (Req 15.7).
   * Falls back to the raw key if missing in both locales.
   */
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value =
        flatDictionaries[activeLocale][key] ?? flatDictionaries.en[key] ?? key

      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          value = value.replace(`{{${paramKey}}}`, String(paramValue))
        }
      }

      return value
    },
    [activeLocale]
  )

  const contextValue: I18nContextValue = {
    locale: activeLocale,
    setLocale,
    t,
  }

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export function useTranslation() {
  const { t, locale, setLocale } = useI18n()
  return { t, locale, setLocale }
}
