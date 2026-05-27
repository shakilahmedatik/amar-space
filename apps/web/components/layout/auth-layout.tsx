'use client'

import type { ReactNode } from 'react'
import { LanguageToggle } from '@/components/language-toggle'
import { useTranslation } from '@/lib/i18n'

interface AuthLayoutProps {
  children: ReactNode
}

/**
 * Layout for authentication pages (login/register).
 * No navigation, centered content, language toggle in top-right.
 * Mobile-first, elderly-friendly design.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'var(--background)',
      }}
    >
      {/* Language toggle - top right */}
      <div
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 10,
        }}
      >
        <LanguageToggle />
      </div>

      {/* App branding */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '2rem',
        }}
      >
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--foreground)',
          }}
        >
          {t('common.appName')}
        </h1>
      </div>

      {/* Auth form container */}
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          backgroundColor: 'var(--background)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
