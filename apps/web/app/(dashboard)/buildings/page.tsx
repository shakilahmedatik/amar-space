'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useSession } from '@/contexts/session-context'
import { useBuildings } from '@/hooks/use-buildings'
import type { Building } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Building list page — /buildings
 * Displays paginated list of buildings (max 50 per page).
 * Owner can create/edit, Manager can only view.
 * Validates: Requirements 5.5, 5.7, 5.8
 */
export default function BuildingsPage() {
  const { role } = useSession()
  const { t } = useTranslation()
  const _router = useRouter()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error } = useBuildings(page, 50)
  const isOwner = role === 'owner'

  const columns: DataTableColumn<Building>[] = [
    {
      key: 'name',
      header: t('buildings.buildingName'),
      render: (row) => (
        <Link
          href={`/buildings/${row.id}`}
          className="text-brand-blue-deep font-medium no-underline hover:underline"
        >
          {row.name}
        </Link>
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
    <>
      {isError && (
        <ErrorFeedback
          message={error?.message || t('buildings.loadError')}
          type="error"
          visible
        />
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-ink">{t('buildings.title')}</h1>

        {isOwner && (
          <Button
            asChild
            className="rounded-full min-h-[44px] bg-primary text-on-primary font-semibold"
          >
            <Link href="/buildings/new">{t('buildings.createBuilding')}</Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <DataTable<Building>
          columns={columns}
          data={data?.data ?? []}
          getRowKey={(row) => row.id}
          pagination={
            data
              ? { total: data.total, page: data.page, pageSize: data.pageSize }
              : undefined
          }
          onPageChange={setPage}
          loading={isLoading}
          emptyMessage={t('buildings.noBuildings')}
        />
      )}
    </>
  )
}
