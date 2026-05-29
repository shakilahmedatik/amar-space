export type Locale = 'bn' | 'en'

export type TranslationValue =
  | string
  | Record<string, string>
  | Record<string, Record<string, string>>

export type TranslationDictionary = Record<string, TranslationValue>

export type FlatTranslations = Record<string, string>

export const DEFAULT_LOCALE: Locale = 'bn'
export const SUPPORTED_LOCALES: Locale[] = ['bn', 'en']
export const LOCALE_STORAGE_KEY = 'amarspace-locale'
