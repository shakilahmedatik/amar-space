'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useBuildings } from '@/hooks/use-buildings'
import type { Building } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Building list page — /buildings
 * Displays paginated list of buildings (max 50 per page).
 * Owner can create/edit, Manager can only view.
 * Validates: Requirements 5.5, 5.7, 5.8
 */
export default function BuildingsPage() {
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

  const { data, isLoading, isError, error } = useBuildings(page, 50)

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
  const isOwner = role === 'owner'

  const columns: DataTableColumn<Building>[] = [
    {
      key: 'name',
      header: t('buildings.buildingName'),
      render: (row) => (
        <a
          href={`/buildings/${row.id}`}
          style={{
            color: '#2563eb',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          {row.name}
        </a>
      ),
    },
    {
      key: 'address',
      header: t('buildings.address'),
      render: (row) => <span>{row.address}</span>,
    },
    {
      key: 'totalFloors',
      header: t('buildings.totalFloors'),
      render: (row) => <span>{row.totalFloors ?? '—'}</span>,
      width: '120px',
    },
  ]

  return (
    <DashboardLayout role={role} activePath="/buildings">
      {isError && (
        <ErrorFeedback
          message={error?.message || t('buildings.loadError')}
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
          {t('buildings.title')}
        </h1>

        {isOwner && (
          <a
            href="/buildings/new"
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
            {t('buildings.createBuilding')}
          </a>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <DataTable<Building>
          columns={columns}
          data={data?.data ?? []}
          getRowKey={(row) => row.id}
          pagination={data?.pagination}
          onPageChange={setPage}
          loading={isLoading}
          emptyMessage={t('buildings.noBuildings')}
        />
      )}
    </DashboardLayout>
  )
}
