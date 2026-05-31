'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { StatusBadge } from '@/components/ui/status-badge'
import { useSession } from '@/contexts/session-context'
import { useBuildings, useFlats } from '@/hooks/use-flats'
import type { Flat, FlatStatus } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Flat list page — /flats
 * Displays paginated flat list with status and building filters.
 * Validates: Requirements 6.1, 6.2, 6.7, 6.8, 6.11
 */
export default function FlatsPage() {
  const { t } = useTranslation()
  const { role } = useSession()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<FlatStatus | ''>('')
  const [buildingFilter, setBuildingFilter] = useState('')

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

  const columns: DataTableColumn<Flat>[] = [
    {
      key: 'flatNumber',
      header: t('flats.flatNumber'),
      render: (row) => <span className="font-medium">{row.flatNumber}</span>,
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
        <Link
          href={`/flats/${row.id}`}
          className="inline-flex items-center min-w-[44px] min-h-[44px] text-sm font-medium text-brand-blue-deep no-underline"
        >
          {t('flats.viewDetail')}
        </Link>
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
    <>
      {error && (
        <ErrorFeedback
          message={error.message || t('common.error')}
          type="error"
          visible
        />
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-ink">{t('flats.title')}</h1>

        {role === 'owner' && (
          <Button asChild className="rounded-full min-h-[44px]">
            <Link href="/flats/new">{t('flats.createFlat')}</Link>
          </Button>
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
                total: data.total,
              }
            : undefined
        }
        onPageChange={handlePageChange}
        filters={filters}
        filterValues={{ status: statusFilter, building: buildingFilter }}
        onFilterChange={handleFilterChange}
      />
    </>
  )
}
