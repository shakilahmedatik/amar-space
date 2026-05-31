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
import { useIssues } from '@/hooks/use-issues'
import type {
  IssueCategory,
  IssueListItem,
  IssuePriority,
  IssueStatus,
} from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Issue list page — /issues
 * Displays paginated list of building-level issues with multi-field filters.
 * Owner/Manager can create new issues.
 * Validates: Requirements 11.1, 11.5, 11.6
 */
export default function IssuesPage() {
  const { role } = useSession()
  const { t } = useTranslation()
  const _router = useRouter()
  const [page, setPage] = useState(1)

  // Filter state
  const [buildingFilter, setBuildingFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | ''>('')
  const [statusFilter, setStatusFilter] = useState<IssueStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | ''>('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const { data, isLoading, isError, error } = useIssues({
    page,
    pageSize: 50,
    buildingId: buildingFilter || undefined,
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    assigneeId: assigneeFilter || undefined,
  })

  const { data: buildingsData } = useBuildings(1, 100)

  const handleFilterChange = useCallback((key: string, value: string) => {
    setPage(1)
    switch (key) {
      case 'building':
        setBuildingFilter(value)
        break
      case 'category':
        setCategoryFilter(value as IssueCategory | '')
        break
      case 'status':
        setStatusFilter(value as IssueStatus | '')
        break
      case 'priority':
        setPriorityFilter(value as IssuePriority | '')
        break
      case 'assignee':
        setAssigneeFilter(value)
        break
    }
  }, [])
  const canCreate = role === 'owner' || role === 'manager'

  const filters = [
    {
      key: 'building',
      label: t('issues.building'),
      type: 'select' as const,
      placeholder: t('issues.allBuildings'),
      options: (buildingsData?.data ?? []).map((b) => ({
        value: b.id,
        label: b.name,
      })),
    },
    {
      key: 'category',
      label: t('issues.category'),
      type: 'select' as const,
      placeholder: t('issues.allCategories'),
      options: [
        { value: 'plumbing', label: t('issues.plumbing') },
        { value: 'electrical', label: t('issues.electrical') },
        { value: 'structural', label: t('issues.structural') },
        { value: 'cleaning', label: t('issues.cleaning') },
        { value: 'security', label: t('issues.security') },
        { value: 'other', label: t('issues.other') },
      ],
    },
    {
      key: 'status',
      label: t('issues.status'),
      type: 'select' as const,
      placeholder: t('issues.allStatuses'),
      options: [
        { value: 'open', label: t('issues.statusOpen') },
        { value: 'in_progress', label: t('issues.statusInProgress') },
        { value: 'resolved', label: t('issues.statusResolved') },
        { value: 'closed', label: t('issues.statusClosed') },
      ],
    },
    {
      key: 'priority',
      label: t('issues.priority'),
      type: 'select' as const,
      placeholder: t('issues.allPriorities'),
      options: [
        { value: 'low', label: t('issues.low') },
        { value: 'medium', label: t('issues.medium') },
        { value: 'high', label: t('issues.high') },
        { value: 'urgent', label: t('issues.urgent') },
      ],
    },
  ]

  const filterValues: Record<string, string> = {
    building: buildingFilter,
    category: categoryFilter,
    status: statusFilter,
    priority: priorityFilter,
    assignee: assigneeFilter,
  }

  const columns: DataTableColumn<IssueListItem>[] = [
    {
      key: 'title',
      header: t('issues.issueTitle'),
      render: (row) => (
        <Link
          href={`/issues/${row.id}`}
          className="text-brand-blue-deep font-medium no-underline hover:underline"
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: 'buildingName',
      header: t('issues.building'),
      render: (row) => <span>{row.buildingName}</span>,
    },
    {
      key: 'category',
      header: t('issues.category'),
      render: (row) => (
        <span className="capitalize">{t(`issues.${row.category}`)}</span>
      ),
      width: '120px',
    },
    {
      key: 'priority',
      header: t('issues.priority'),
      render: (row) => <StatusBadge status={row.priority} />,
      width: '100px',
    },
    {
      key: 'status',
      header: t('issues.status'),
      render: (row) => <StatusBadge status={row.status} />,
      width: '130px',
    },
    {
      key: 'assigneeName',
      header: t('issues.assignee'),
      render: (row) => (
        <span className={row.assigneeName ? 'text-ink' : 'text-stone'}>
          {row.assigneeName || t('issues.unassigned')}
        </span>
      ),
      width: '140px',
    },
    {
      key: 'createdAt',
      header: t('issues.createdAt'),
      render: (row) => (
        <span className="text-xs text-steel">
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
          message={error?.message || t('issues.loadError')}
          type="error"
          visible
        />
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-ink">{t('issues.title')}</h1>

        {canCreate && (
          <Button
            asChild
            className="min-h-[44px] rounded-full bg-primary text-on-primary font-semibold"
          >
            <Link href="/issues/new">{t('issues.createIssue')}</Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <DataTable<IssueListItem>
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
          emptyMessage={t('issues.noIssues')}
        />
      )}
    </>
  )
}
