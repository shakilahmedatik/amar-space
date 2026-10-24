"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { defaultTranslations, type Locale } from "../lib/translations";

interface LanguageContextType {
  locale: Locale;
  isBangla: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "omniheaven-locale";

export function LanguageProvider({
  children,
  defaultLocale = "en",
  storageKey = STORAGE_KEY,
  customMessages,
}: {
  children: React.ReactNode;
  defaultLocale?: Locale;
  storageKey?: string;
  customMessages?: Partial<Record<Locale, Record<string, string>>>;
}) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey) as Locale | null;
      if (stored && (stored === "en" || stored === "bn")) {
        setLocaleState(stored);
      }
    } catch {
      // storage unavailable
    }
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;

    if (locale === "bn") {
      document.documentElement.classList.add("locale-bn");
    } else {
      document.documentElement.classList.remove("locale-bn");
    }
  }, [locale, mounted]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(storageKey, newLocale);
    } catch {
      // storage unavailable
    }
  };

  const toggleLocale = () => {
    setLocale(locale === "en" ? "bn" : "en");
  };

  const t = (key: string, fallback?: string): string => {
    const custom = customMessages?.[locale]?.[key];
    if (custom) return custom;

    const translation = defaultTranslations[locale]?.[key];
    if (translation) return translation;

    // Fallback to English if missing in Bengali
    if (locale === "bn") {
      const enFallback = defaultTranslations.en?.[key];
      if (enFallback) return enFallback;
    }

    return fallback ?? key;
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        isBangla: locale === "bn",
        setLocale,
        toggleLocale,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider from @omniheaven/ui");
  }
  return context;
}
