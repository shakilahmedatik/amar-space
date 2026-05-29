'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
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
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          router.push('/login')
          return
        }
        setUser(session)
      } catch {
        router.push('/login')
      } finally {
        setIsLoadingSession(false)
      }
    }
    loadSession()
  }, [])

  const { data, isLoading, isError, error } = useRenters(page, 50)

  if (isLoadingSession || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
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
    <DashboardLayout role={role} activePath="/renters">
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
    </DashboardLayout>
  )
}
