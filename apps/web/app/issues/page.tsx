'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useBuildings } from '@/hooks/use-buildings'
import { useIssues } from '@/hooks/use-issues'
import type {
  IssueCategory,
  IssueListItem,
  IssuePriority,
  IssueStatus,
} from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Issue list page — /issues
 * Displays paginated list of building-level issues with multi-field filters.
 * Owner/Manager can create new issues.
 * Validates: Requirements 11.1, 11.5, 11.6
 */
export default function IssuesPage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [page, setPage] = useState(1)

  // Filter state
  const [buildingFilter, setBuildingFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | ''>('')
  const [statusFilter, setStatusFilter] = useState<IssueStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | ''>('')
  const [assigneeFilter, setAssigneeFilter] = useState('')

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
        <a
          href={`/issues/${row.id}`}
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
      header: t('issues.building'),
      render: (row) => <span>{row.buildingName}</span>,
    },
    {
      key: 'category',
      header: t('issues.category'),
      render: (row) => (
        <span style={{ textTransform: 'capitalize' }}>
          {t(`issues.${row.category}`)}
        </span>
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
        <span style={{ color: row.assigneeName ? '#111827' : '#9ca3af' }}>
          {row.assigneeName || t('issues.unassigned')}
        </span>
      ),
      width: '140px',
    },
    {
      key: 'createdAt',
      header: t('issues.createdAt'),
      render: (row) => (
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
      width: '110px',
    },
  ]

  return (
    <DashboardLayout role={role} activePath="/issues">
      {isError && (
        <ErrorFeedback
          message={error?.message || t('issues.loadError')}
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
          {t('issues.title')}
        </h1>

        {canCreate && (
          <a
            href="/issues/new"
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
            {t('issues.createIssue')}
          </a>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <DataTable<IssueListItem>
          columns={columns}
          data={data?.data ?? []}
          getRowKey={(row) => row.id}
          pagination={data?.pagination}
          onPageChange={setPage}
          filters={filters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          loading={isLoading}
          emptyMessage={t('issues.noIssues')}
        />
      )}
    </DashboardLayout>
  )
}
