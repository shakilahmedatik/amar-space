'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useNotices } from '@/hooks/use-notices'
import type { NoticeListItem, NoticeTargetAudience } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Notice list page — /notices
 * Displays paginated list of notices with pinned notices at top.
 * Filtered by target audience. Owner/Manager can create new notices.
 * Validates: Requirements 12.1, 12.2, 12.5, 12.6, 12.8, 12.9
 */
export default function NoticesPage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [page, setPage] = useState(1)

  // Filter state
  const [audienceFilter, setAudienceFilter] = useState<
    NoticeTargetAudience | ''
  >('')
  const [pinnedFilter, setPinnedFilter] = useState<boolean | ''>('')

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

  const { data, isLoading, isError, error } = useNotices({
    page,
    pageSize: 50,
    targetAudience: audienceFilter || undefined,
    pinned: pinnedFilter !== '' ? pinnedFilter : undefined,
  })

  const handleFilterChange = useCallback((key: string, value: string) => {
    setPage(1)
    switch (key) {
      case 'audience':
        setAudienceFilter(value as NoticeTargetAudience | '')
        break
      case 'pinned':
        if (value === '') setPinnedFilter('')
        else if (value === 'true') setPinnedFilter(true)
        else setPinnedFilter(false)
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
  const canCreate = role === 'owner' || role === 'manager'

  const audienceLabels: Record<NoticeTargetAudience, string> = {
    all_renters: t('notices.allRenters'),
    specific_building: t('notices.specificBuilding'),
    specific_flat: t('notices.specificFlat'),
    managers_only: t('notices.managersOnly'),
  }

  const filters = [
    {
      key: 'audience',
      label: t('notices.targetAudience'),
      type: 'select' as const,
      placeholder: t('notices.allAudiences'),
      options: [
        { value: 'all_renters', label: t('notices.allRenters') },
        { value: 'specific_building', label: t('notices.specificBuilding') },
        { value: 'specific_flat', label: t('notices.specificFlat') },
        { value: 'managers_only', label: t('notices.managersOnly') },
      ],
    },
    {
      key: 'pinned',
      label: t('notices.pinned'),
      type: 'select' as const,
      placeholder: t('notices.allPinStatus'),
      options: [
        { value: 'true', label: t('notices.pinnedOnly') },
        { value: 'false', label: t('notices.unpinnedOnly') },
      ],
    },
  ]

  const filterValues: Record<string, string> = {
    audience: audienceFilter,
    pinned: pinnedFilter === '' ? '' : String(pinnedFilter),
  }

  const columns: DataTableColumn<NoticeListItem>[] = [
    {
      key: 'title',
      header: t('notices.noticeTitle'),
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {row.isPinned && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                fontSize: '0.75rem',
                color: '#f59e0b',
              }}
              title={t('notices.pinned')}
            >
              📌
            </span>
          )}
          <a
            href={`/notices/${row.id}`}
            style={{
              color: '#2563eb',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {row.title}
          </a>
        </div>
      ),
    },
    {
      key: 'targetAudience',
      header: t('notices.targetAudience'),
      render: (row) => (
        <span style={{ fontSize: '0.8125rem' }}>
          {audienceLabels[row.targetAudience]}
          {row.targetBuildingName && ` — ${row.targetBuildingName}`}
          {row.targetFlatNumber && ` — ${row.targetFlatNumber}`}
        </span>
      ),
    },
    {
      key: 'authorName',
      header: t('notices.author'),
      render: (row) => <span>{row.authorName}</span>,
      width: '140px',
    },
    {
      key: 'createdAt',
      header: t('notices.createdAt'),
      render: (row) => (
        <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
      width: '110px',
    },
  ]

  return (
    <DashboardLayout role={role} activePath="/notices">
      {isError && (
        <ErrorFeedback
          message={error?.message || t('notices.loadError')}
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
          {t('notices.title')}
        </h1>

        {canCreate && (
          <a
            href="/notices/new"
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
            {t('notices.createNotice')}
          </a>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <DataTable<NoticeListItem>
          columns={columns}
          data={data?.data ?? []}
          getRowKey={(row) => row.id}
          pagination={data?.pagination}
          onPageChange={setPage}
          filters={filters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          loading={isLoading}
          emptyMessage={t('notices.noNotices')}
        />
      )}
    </DashboardLayout>
  )
}
