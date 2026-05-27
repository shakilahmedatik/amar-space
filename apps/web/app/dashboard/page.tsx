'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'
import { ManagerDashboard } from './manager-dashboard'
import { OwnerDashboard } from './owner-dashboard'
import { RenterDashboard } from './renter-dashboard'

type UserRole = 'owner' | 'manager' | 'renter'

interface SessionUser {
  id: string
  email: string
  name?: string
  role: string
}

/**
 * Dashboard page — /dashboard
 * Detects user role from session and renders the appropriate role-specific dashboard.
 * Validates: Requirements 20.1, 20.2, 20.3, 20.4, 20.5, 20.7, 20.8
 */
export default function DashboardPage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          // Not authenticated, redirect to login
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

  return (
    <DashboardLayout role={role} activePath="/dashboard">
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          marginBottom: '1.5rem',
          color: '#111827',
        }}
      >
        {t('dashboard.title')}
      </h1>

      {role === 'owner' && <OwnerDashboard />}
      {role === 'manager' && <ManagerDashboard />}
      {role === 'renter' && <RenterDashboard />}
    </DashboardLayout>
  )
}
