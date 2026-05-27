'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useBuildings } from '@/hooks/use-buildings'
import { useMaintenanceRequests } from '@/hooks/use-maintenance'
import type {
  MaintenancePriority,
  MaintenanceRequestListItem,
  MaintenanceStatus,
} from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Maintenance request list page — /maintenance
 * Displays paginated list of maintenance requests with filters.
 * Renter can create new requests.
 * Validates: Requirements 10.6, 10.7, 10.8, 10.10
 */
export default function MaintenancePage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [page, setPage] = useState(1)

  // Filter state
  const [buildingFilter, setBuildingFilter] = useState('')
  const [flatFilter, setFlatFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<
    MaintenancePriority | ''
  >('')

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

  const { data, isLoading, isError, error } = useMaintenanceRequests({
    page,
    pageSize: 50,
    buildingId: buildingFilter || undefined,
    flatId: flatFilter || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  })

  const { data: buildingsData } = useBuildings(1, 100)

  const handleFilterChange = useCallback((key: string, value: string) => {
    setPage(1)
    switch (key) {
      case 'building':
        setBuildingFilter(value)
        break
      case 'flat':
        setFlatFilter(value)
        break
      case 'status':
        setStatusFilter(value as MaintenanceStatus | '')
        break
      case 'priority':
        setPriorityFilter(value as MaintenancePriority | '')
        break
    }
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
  const canCreate = role === 'renter'

  const filters = [
    {
      key: 'building',
      label: t('maintenance.building'),
      type: 'select' as const,
      placeholder: t('maintenance.allBuildings'),
      options: (buildingsData?.data ?? []).map((b) => ({
        value: b.id,
        label: b.name,
      })),
    },
    {
      key: 'status',
      label: t('maintenance.status'),
      type: 'select' as const,
      placeholder: t('maintenance.allStatuses'),
      options: [
        { value: 'open', label: t('maintenance.statusOpen') },
        { value: 'in_progress', label: t('maintenance.statusInProgress') },
        { value: 'resolved', label: t('maintenance.statusResolved') },
        { value: 'closed', label: t('maintenance.statusClosed') },
      ],
    },
    {
      key: 'priority',
      label: t('maintenance.priority'),
      type: 'select' as const,
      placeholder: t('maintenance.allPriorities'),
      options: [
        { value: 'low', label: t('maintenance.low') },
        { value: 'medium', label: t('maintenance.medium') },
        { value: 'high', label: t('maintenance.high') },
        { value: 'urgent', label: t('maintenance.urgent') },
      ],
    },
  ]

  const filterValues: Record<string, string> = {
    building: buildingFilter,
    flat: flatFilter,
    status: statusFilter,
    priority: priorityFilter,
  }

  const columns: DataTableColumn<MaintenanceRequestListItem>[] = [
    {
      key: 'title',
      header: t('maintenance.requestTitle'),
      render: (row) => (
        <a
          href={`/maintenance/${row.id}`}
          style={{
            color: '#2563eb',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          {row.title}
        </a>
      ),
    },
    {
      key: 'buildingName',
      header: t('maintenance.building'),
      render: (row) => <span>{row.buildingName}</span>,
    },
    {
      key: 'flatNumber',
      header: t('maintenance.flat'),
      render: (row) => <span>{row.flatNumber}</span>,
      width: '100px',
    },
    {
      key: 'priority',
      header: t('maintenance.priority'),
      render: (row) => <StatusBadge status={row.priority} />,
      width: '110px',
    },
    {
      key: 'status',
      header: t('maintenance.status'),
      render: (row) => <StatusBadge status={row.status} />,
      width: '140px',
    },
    {
      key: 'createdAt',
      header: t('maintenance.createdAt'),
      render: (row) => (
        <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
      width: '110px',
    },
  ]

  return (
    <DashboardLayout role={role} activePath="/maintenance">
      {isError && (
        <ErrorFeedback
          message={error?.message || t('maintenance.loadError')}
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
          {t('maintenance.title')}
        </h1>

        {canCreate && (
          <a
            href="/maintenance/new"
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
            {t('maintenance.createRequest')}
          </a>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <DataTable<MaintenanceRequestListItem>
          columns={columns}
          data={data?.data ?? []}
          getRowKey={(row) => row.id}
          pagination={data?.pagination}
          onPageChange={setPage}
          filters={filters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          loading={isLoading}
          emptyMessage={t('maintenance.noRequests')}
        />
      )}
    </DashboardLayout>
  )
}
