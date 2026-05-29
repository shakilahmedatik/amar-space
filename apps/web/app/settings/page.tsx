'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  const router = useRouter()
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
          router.push('/login')
          return
        }
        setUser(session)
      } catch {
        router.push('/login')
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
      <div className="flex h-dvh items-center justify-center bg-surface">
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

      <h1 className="text-2xl font-bold mb-6 text-ink">
        {t('settings.title')}
      </h1>

      <div className="flex flex-col gap-6 max-w-[640px]">
        {/* Language Preference Section */}
        <Card className="bg-canvas border border-hairline rounded-lg">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-ink mb-2">
              {t('settings.languagePreference')}
            </h2>
            <p className="text-sm text-steel mb-4 leading-relaxed">
              {t('settings.languageDescription')}
            </p>

            <div className="flex gap-3 flex-wrap">
              <Button
                type="button"
                variant={locale === 'bn' ? 'default' : 'outline'}
                onClick={() => handleLanguageChange('bn')}
                disabled={isSavingLanguage}
                aria-pressed={locale === 'bn'}
                className="rounded-full min-h-[44px] px-5 font-medium"
              >
                বাংলা
              </Button>
              <Button
                type="button"
                variant={locale === 'en' ? 'default' : 'outline'}
                onClick={() => handleLanguageChange('en')}
                disabled={isSavingLanguage}
                aria-pressed={locale === 'en'}
                className="rounded-full min-h-[44px] px-5 font-medium"
              >
                English
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Information Section */}
        <Card className="bg-canvas border border-hairline rounded-lg">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-ink mb-4">
              {t('settings.accountInfo')}
            </h2>

            {isLoadingProfile ? (
              <LoadingSkeleton rows={4} />
            ) : profile ? (
              <dl className="grid grid-cols-1 gap-3">
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
              <p className="text-steel text-sm">{t('settings.loadError')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

/**
 * Simple info row component for displaying label-value pairs.
 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-surface-soft">
      <dt className="text-[0.8125rem] font-medium text-steel">{label}</dt>
      <dd className="text-base font-normal text-ink m-0">{value}</dd>
    </div>
  )
}
