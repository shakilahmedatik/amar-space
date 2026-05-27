'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useBuildings, useFlats } from '@/hooks/use-flats'
import type { Flat, FlatStatus } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Flat list page — /flats
 * Displays paginated flat list with status and building filters.
 * Validates: Requirements 6.1, 6.2, 6.7, 6.8, 6.11
 */
export default function FlatsPage() {
  const { t } = useTranslation()
  const [role, setRole] = useState<UserRole>('owner')
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<FlatStatus | ''>('')
  const [buildingFilter, setBuildingFilter] = useState('')

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
        setRole(session.role as UserRole)
      } catch {
        window.location.href = '/login'
      } finally {
        setIsLoadingSession(false)
      }
    }
    loadSession()
  }, [])

  const { data, isLoading, error } = useFlats({
    page,
    pageSize: 50,
    status: statusFilter || undefined,
    buildingId: buildingFilter || undefined,
  })

  const { data: buildingsData } = useBuildings()

  const handleFilterChange = useCallback((key: string, value: string) => {
    setPage(1)
    if (key === 'status') {
      setStatusFilter(value as FlatStatus | '')
    } else if (key === 'building') {
      setBuildingFilter(value)
    }
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  if (isLoadingSession) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4">
          <LoadingSkeleton rows={5} showHeader />
        </div>
      </div>
    )
  }

  const columns: DataTableColumn<Flat>[] = [
    {
      key: 'flatNumber',
      header: t('flats.flatNumber'),
      render: (row) => (
        <span style={{ fontWeight: 500 }}>{row.flatNumber}</span>
      ),
    },
    {
      key: 'floor',
      header: t('flats.floor'),
      render: (row) => <span>{row.floor}</span>,
    },
    {
      key: 'building',
      header: t('flats.building'),
      render: (row) => <span>{row.buildingName || '—'}</span>,
    },
    {
      key: 'status',
      header: t('flats.status'),
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: t('flats.actions'),
      render: (row) => (
        <a
          href={`/flats/${row.id}`}
          style={{
            color: '#2563eb',
            fontWeight: 500,
            fontSize: '0.875rem',
            textDecoration: 'none',
            minWidth: '44px',
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {t('flats.viewDetail')}
        </a>
      ),
    },
  ]

  const filters: DataTableFilter[] = [
    {
      key: 'status',
      label: t('flats.status'),
      type: 'select',
      placeholder: t('flats.allStatuses'),
      options: [
        { value: 'vacant', label: t('flats.vacant') },
        { value: 'occupied', label: t('flats.occupied') },
        { value: 'under_maintenance', label: t('flats.underMaintenance') },
      ],
    },
    {
      key: 'building',
      label: t('flats.building'),
      type: 'select',
      placeholder: t('flats.allBuildings'),
      options: (buildingsData?.data || []).map((b) => ({
        value: b.id,
        label: b.name,
      })),
    },
  ]

  return (
    <DashboardLayout role={role} activePath="/flats">
      {error && (
        <ErrorFeedback
          message={error.message || t('common.error')}
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
          {t('flats.title')}
        </h1>

        {role === 'owner' && (
          <a
            href="/flats/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {t('flats.createFlat')}
          </a>
        )}
      </div>

      <DataTable<Flat>
        columns={columns}
        data={data?.data || []}
        getRowKey={(row) => row.id}
        loading={isLoading}
        emptyMessage={t('flats.noFlats')}
        pagination={
          data
            ? {
                page: data.page,
                pageSize: data.pageSize,
                totalItems: data.total,
              }
            : undefined
        }
        onPageChange={handlePageChange}
        filters={filters}
        filterValues={{ status: statusFilter, building: buildingFilter }}
        onFilterChange={handleFilterChange}
      />
    </DashboardLayout>
  )
}
