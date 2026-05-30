'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useRenters } from '@/hooks/use-renters'
import type { RenterListItem } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'
import { useSession } from '@/contexts/session-context'

/**
 * Renter list page — /renters
 * Displays paginated list of renters.
 * Owner/Manager can register new renters.
 * Validates: Requirements 4.1
 */
export default function RentersPage() {
  const { role } = useSession()
  const { t } = useTranslation()
  const router = useRouter()
const [page, setPage] = useState(1)
const { data, isLoading, isError, error } = useRenters(page, 50)
const canRegister = role === 'owner' || role === 'manager'

  const columns: DataTableColumn<RenterListItem>[] = [
    {
      key: 'fullName',
      header: t('renters.fullName'),
      render: (row) => (
        <Link
          href={`/renters/${row.id}`}
          className="text-brand-blue-deep font-medium no-underline hover:underline"
        >
          {row.fullName}
        </Link>
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
    <>
      {isError && (
        <ErrorFeedback
          message={error?.message || t('renters.loadError')}
          type="error"
          visible
        />
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-ink">{t('renters.title')}</h1>

        {canRegister && (
          <Button
            asChild
            className="min-h-[44px] rounded-full bg-primary text-on-primary font-semibold"
          >
            <Link href="/renters/new">{t('renters.registerRenter')}</Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <DataTable<RenterListItem>
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
          emptyMessage={t('renters.noRenters')}
        />
      )}
    </>
  )
}
