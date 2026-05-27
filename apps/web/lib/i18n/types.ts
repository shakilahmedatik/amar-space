export type Locale = 'bn' | 'en'

export type TranslationDictionary = Record<
  string,
  string | Record<string, string>
>

export type FlatTranslations = Record<string, string>

export const DEFAULT_LOCALE: Locale = 'bn'
export const SUPPORTED_LOCALES: Locale[] = ['bn', 'en']
export const LOCALE_STORAGE_KEY = 'amarspace-locale'
