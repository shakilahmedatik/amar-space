'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import {
  fetchUserProfile,
  type UserProfile,
  updateLanguagePreference,
} from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { type Locale, useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * User settings page — /settings
 * Provides language preference toggle with server-side persistence
 * and displays current user role and account info.
 * Validates: Requirements 15.5, 15.6
 */
export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSavingLanguage, setIsSavingLanguage] = useState(false)
  const [feedback, setFeedback] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
        setUser(session)
      } catch {
        window.location.href = '/login'
      } finally {
        setIsLoadingSession(false)
      }
    }
    loadSession()
  }, [])

  useEffect(() => {
    if (!user) return

    async function loadProfile() {
      try {
        const data = await fetchUserProfile()
        setProfile(data)
      } catch {
        setFeedback({ message: t('settings.loadError'), type: 'error' })
      } finally {
        setIsLoadingProfile(false)
      }
    }
    loadProfile()
  }, [user, t])

  /**
   * Handle language toggle.
   * Updates the locale immediately (within 2 seconds, Req 15.6)
   * and persists server-side for authenticated users (Req 15.5).
   */
  const handleLanguageChange = useCallback(
    async (newLocale: Locale) => {
      // Update UI immediately — no page reload required (Req 15.6)
      setLocale(newLocale)
      setIsSavingLanguage(true)
      setFeedback(null)

      try {
        // Persist server-side for authenticated users (Req 15.5)
        await updateLanguagePreference(newLocale)
        setFeedback({
          message: t('settings.languageUpdateSuccess'),
          type: 'success',
        })
      } catch {
        setFeedback({
          message: t('settings.languageUpdateError'),
          type: 'error',
        })
      } finally {
        setIsSavingLanguage(false)
      }
    },
    [setLocale, t],
  )

  if (isLoadingSession || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4">
          <LoadingSkeleton rows={5} showHeader />
        </div>
      </div>
    )
  }

  const role = user.role as UserRole

  /**
   * Get the display label for a user role.
   */
  function getRoleLabel(userRole: string): string {
    switch (userRole) {
      case 'owner':
        return t('settings.roleOwner')
      case 'manager':
        return t('settings.roleManager')
      case 'renter':
        return t('settings.roleRenter')
      default:
        return userRole
    }
  }

  return (
    <DashboardLayout role={role} activePath="/settings">
      {feedback && (
        <ErrorFeedback
          message={feedback.message}
          type={feedback.type}
          visible
          onDismiss={() => setFeedback(null)}
        />
      )}

      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          marginBottom: '1.5rem',
          color: '#111827',
        }}
      >
        {t('settings.title')}
      </h1>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          maxWidth: '640px',
        }}
      >
        {/* Language Preference Section */}
        <section
          style={{
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
          }}
        >
          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '0.5rem',
            }}
          >
            {t('settings.languagePreference')}
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '1rem',
              lineHeight: '1.6',
            }}
          >
            {t('settings.languageDescription')}
          </p>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => handleLanguageChange('bn')}
              disabled={isSavingLanguage}
              aria-pressed={locale === 'bn'}
              style={{
                minWidth: '44px',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.625rem 1.25rem',
                fontSize: '1rem',
                fontWeight: 500,
                borderRadius: '0.375rem',
                border:
                  locale === 'bn' ? '2px solid #2563eb' : '1px solid #d1d5db',
                backgroundColor: locale === 'bn' ? '#eff6ff' : 'transparent',
                color: locale === 'bn' ? '#2563eb' : '#374151',
                cursor: isSavingLanguage ? 'not-allowed' : 'pointer',
                opacity: isSavingLanguage ? 0.7 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              disabled={isSavingLanguage}
              aria-pressed={locale === 'en'}
              style={{
                minWidth: '44px',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.625rem 1.25rem',
                fontSize: '1rem',
                fontWeight: 500,
                borderRadius: '0.375rem',
                border:
                  locale === 'en' ? '2px solid #2563eb' : '1px solid #d1d5db',
                backgroundColor: locale === 'en' ? '#eff6ff' : 'transparent',
                color: locale === 'en' ? '#2563eb' : '#374151',
                cursor: isSavingLanguage ? 'not-allowed' : 'pointer',
                opacity: isSavingLanguage ? 0.7 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              English
            </button>
          </div>
        </section>

        {/* Account Information Section */}
        <section
          style={{
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
          }}
        >
          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '1rem',
            }}
          >
            {t('settings.accountInfo')}
          </h2>

          {isLoadingProfile ? (
            <LoadingSkeleton rows={4} />
          ) : profile ? (
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '0.75rem',
              }}
            >
              <InfoRow label={t('settings.email')} value={profile.email} />
              <InfoRow
                label={t('settings.name')}
                value={profile.name || t('settings.notProvided')}
              />
              <InfoRow
                label={t('settings.role')}
                value={getRoleLabel(profile.role)}
              />
              <InfoRow
                label={t('settings.phone')}
                value={profile.phone || t('settings.notProvided')}
              />
              <InfoRow
                label={t('settings.memberSince')}
                value={new Date(profile.createdAt).toLocaleDateString(
                  locale === 'bn' ? 'bn-BD' : 'en-GB',
                  {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  },
                )}
              />
            </dl>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {t('settings.loadError')}
            </p>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}

/**
 * Simple info row component for displaying label-value pairs.
 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        padding: '0.5rem 0',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      <dt
        style={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: '#6b7280',
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontSize: '1rem',
          fontWeight: 400,
          color: '#111827',
          margin: 0,
        }}
      >
        {value}
      </dd>
    </div>
  )
}
