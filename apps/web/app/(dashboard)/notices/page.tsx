'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useSession } from '@/contexts/session-context'
import { useCreateNoticeTemplate } from '@/hooks/use-notice-templates'
import { useNotices } from '@/hooks/use-notices'
import type { NoticeListItem, NoticeTargetAudience } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Notice list page — /notices
 * Displays paginated list of notices with pinned notices at top.
 * Supports Active/Archived tabs, target audience filter, and template creation.
 */
export default function NoticesPage() {
  const { role } = useSession()
  const { t } = useTranslation()
  const router = useRouter()
  const [page, setPage] = useState(1)

  // Filter state
  const [audienceFilter, setAudienceFilter] = useState<
    NoticeTargetAudience | ''
  >('')
  const [pinnedFilter, setPinnedFilter] = useState<boolean | ''>('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>(
    'active',
  )
  const createTemplateMutation = useCreateNoticeTemplate()
  const { data, isLoading, isError, error } = useNotices({
    page,
    pageSize: 50,
    targetAudience: audienceFilter || undefined,
    pinned: pinnedFilter !== '' ? pinnedFilter : undefined,
    status: statusFilter,
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

  function handleUseAsTemplate(notice: NoticeListItem) {
    const name = `${notice.title} ${t('notices.templateSuffix')}`
    createTemplateMutation.mutate(
      {
        name,
        title: notice.title,
        body: notice.body || '',
        targetAudience: notice.targetAudience,
      },
      {
        onSuccess: () => {
          router.push('/notices/templates')
        },
      },
    )
  }

  const columns: DataTableColumn<NoticeListItem>[] = [
    {
      key: 'title',
      header: t('notices.noticeTitle'),
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.isPinned && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 text-xs text-brand-orange"
              title={t('notices.pinned')}
            >
              📌
            </span>
          )}
          <Link
            href={`/notices/${row.id}`}
            className="text-brand-blue-deep font-medium no-underline hover:underline"
          >
            {row.title}
          </Link>
        </div>
      ),
    },
    {
      key: 'targetAudience',
      header: t('notices.targetAudience'),
      render: (row) => (
        <span className="text-[0.8125rem] text-ink">
          {audienceLabels[row.targetAudience]}
          {row.targetBuildingName && ` — ${row.targetBuildingName}`}
          {row.targetFlatNumber && ` — ${row.targetFlatNumber}`}
        </span>
      ),
    },
    {
      key: 'authorName',
      header: t('notices.author'),
      render: (row) => <span className="text-ink">{row.authorName}</span>,
      width: '140px',
    },
    {
      key: 'expiresAt',
      header: t('notices.expiresAt'),
      render: (row) => (
        <span className="text-[0.8125rem] text-steel">
          {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : '—'}
        </span>
      ),
      width: '110px',
    },
    {
      key: 'createdAt',
      header: t('notices.createdAt'),
      render: (row) => (
        <span className="text-[0.8125rem] text-steel">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
      width: '110px',
    },
    ...(statusFilter === 'archived'
      ? [
          {
            key: 'actions' as string,
            header: '',
            render: (row: NoticeListItem) => (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleUseAsTemplate(row)}
                className="rounded-full text-xs"
              >
                {t('notices.useAsTemplate')}
              </Button>
            ),
            width: '140px',
          },
        ]
      : []),
  ]

  return (
    <>
      {isError && (
        <ErrorFeedback
          message={error?.message || t('notices.loadError')}
          type="error"
          visible
        />
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-ink-strong">
          {t('notices.title')}
        </h1>

        <div className="flex items-center gap-3">
          {canCreate && (
            <>
              <Button
                asChild
                variant="outline"
                className="min-h-9 rounded-full"
              >
                <Link href="/notices/templates">
                  {t('notices.manageTemplates')}
                </Link>
              </Button>
              <Button
                asChild
                className="min-h-11 rounded-full bg-primary text-on-primary font-semibold"
              >
                <Link href="/notices/new">{t('notices.createNotice')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4">
        <button
          type="button"
          onClick={() => {
            setStatusFilter('active')
            setPage(1)
          }}
          className={[
            'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
            statusFilter === 'active'
              ? 'bg-primary text-on-primary'
              : 'bg-hairline text-ink hover:bg-steel/20',
          ].join(' ')}
        >
          {t('notices.active')}
        </button>
        <button
          type="button"
          onClick={() => {
            setStatusFilter('archived')
            setPage(1)
          }}
          className={[
            'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
            statusFilter === 'archived'
              ? 'bg-primary text-on-primary'
              : 'bg-hairline text-ink hover:bg-steel/20',
          ].join(' ')}
        >
          {t('notices.archived')}
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <DataTable<NoticeListItem>
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
          emptyMessage={t('notices.noNotices')}
        />
      )}
    </>
  )
}
