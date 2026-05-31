'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useSession } from '@/contexts/session-context'
import { useBuildings } from '@/hooks/use-buildings'
import { useMaintenanceRequests } from '@/hooks/use-maintenance'
import type {
  MaintenancePriority,
  MaintenanceRequestListItem,
  MaintenanceStatus,
} from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Maintenance request list page — /maintenance
 * Displays paginated list of maintenance requests with filters.
 * Renter can create new requests.
 * Validates: Requirements 10.6, 10.7, 10.8, 10.10
 */
export default function MaintenancePage() {
  const { role } = useSession()
  const { t } = useTranslation()
  const _router = useRouter()
  const [page, setPage] = useState(1)

  // Filter state
  const [buildingFilter, setBuildingFilter] = useState('')
  const [flatFilter, setFlatFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<
    MaintenancePriority | ''
  >('')
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
        <Link
          href={`/maintenance/${row.id}`}
          className="text-brand-blue-deep font-medium no-underline hover:underline"
        >
          {row.title}
        </Link>
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
        <span className="text-[0.8125rem] text-steel">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
      width: '110px',
    },
  ]

  return (
    <>
      {isError && (
        <ErrorFeedback
          message={error?.message || t('maintenance.loadError')}
          type="error"
          visible
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-ink">
          {t('maintenance.title')}
        </h1>

        {canCreate && (
          <Button
            asChild
            className="rounded-full min-h-[44px] bg-primary text-on-primary font-semibold"
          >
            <Link href="/maintenance/new">
              {t('maintenance.createRequest')}
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <DataTable<MaintenanceRequestListItem>
          columns={columns}
          data={data?.data ?? []}
          getRowKey={(row) => row.id}
          pagination={
            data
              ? { total: data.total, page: data.page, pageSize: data.pageSize }
              : undefined
          }
          onPageChange={setPage}
          filters={filters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          loading={isLoading}
          emptyMessage={t('maintenance.noRequests')}
        />
      )}
    </>
  )
}
