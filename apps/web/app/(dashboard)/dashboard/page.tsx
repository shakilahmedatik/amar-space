'use client'

import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useSession } from '@/contexts/session-context'
import { useTranslation } from '@/lib/i18n'
import { ManagerDashboard } from './manager-dashboard'
import { OwnerDashboard } from './owner-dashboard'
import { RenterDashboard } from './renter-dashboard'

/**
 * Dashboard page — /dashboard
 * Detects user role from session and renders the appropriate role-specific dashboard.
 * Validates: Requirements 20.1, 20.2, 20.3, 20.4, 20.5, 20.7, 20.8
 */
export default function DashboardPage() {
  const { t } = useTranslation()
  const { user, role, isLoading } = useSession()

  if (isLoading || !user) {
    return <LoadingSkeleton rows={5} showHeader />
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6 text-ink">
        {t('dashboard.title')}
      </h1>

      {role === 'owner' && <OwnerDashboard />}
      {role === 'manager' && <ManagerDashboard />}
      {role === 'renter' && <RenterDashboard />}
    </>
  )
}
