'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useRenters } from '@/hooks/use-renters'
import type { RenterListItem } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Renter list page — /renters
 * Displays paginated list of renters.
 * Owner/Manager can register new renters.
 * Validates: Requirements 4.1
 */
export default function RentersPage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [page, setPage] = useState(1)

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

  const { data, isLoading, isError, error } = useRenters(page, 50)

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
  const canRegister = role === 'owner' || role === 'manager'

  const columns: DataTableColumn<RenterListItem>[] = [
    {
      key: 'fullName',
      header: t('renters.fullName'),
      render: (row) => (
        <a
          href={`/renters/${row.id}`}
          style={{
            color: '#2563eb',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          {row.fullName}
        </a>
      ),
    },
    {
      key: 'phone',
      header: t('renters.phone'),
      render: (row) => <span>{row.phone}</span>,
    },
    {
      key: 'flatNumber',
      header: t('renters.flat'),
      render: (row) => <span>{row.flatNumber}</span>,
      width: '120px',
    },
    {
      key: 'buildingName',
      header: t('renters.building'),
      render: (row) => <span>{row.buildingName}</span>,
    },
  ]

  return (
    <DashboardLayout role={role} activePath="/renters">
      {isError && (
        <ErrorFeedback
          message={error?.message || t('renters.loadError')}
          type="error"
          visible
        />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111827',
          }}
        >
          {t('renters.title')}
        </h1>

        {canRegister && (
          <a
            href="/renters/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: '0.5rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              textDecoration: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('renters.registerRenter')}
          </a>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <DataTable<RenterListItem>
          columns={columns}
          data={data?.data ?? []}
          getRowKey={(row) => row.id}
          pagination={data?.pagination}
          onPageChange={setPage}
          loading={isLoading}
          emptyMessage={t('renters.noRenters')}
        />
      )}
    </DashboardLayout>
  )
}
