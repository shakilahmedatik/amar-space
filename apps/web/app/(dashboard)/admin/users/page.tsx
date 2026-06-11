'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSession } from '@/contexts/session-context'
import { useAdminUsers, useDeactivateUser } from '@/hooks/use-admin'
import { useTranslation } from '@/lib/i18n'

export default function AdminUsersPage() {
  const { role } = useSession()
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<
    'superadmin' | 'owner' | 'manager' | ''
  >('')
  const pageSize = 20
  const { data, isLoading, isError, error } = useAdminUsers({
    page,
    pageSize,
    role: roleFilter || undefined,
  })
  const deactivateMutation = useDeactivateUser()

  const handleDeactivate = useCallback(
    (userId: string, _userName: string) => {
      if (window.confirm(t('adminUsers.confirmDeactivate'))) {
        deactivateMutation.mutate(userId)
      }
    },
    [deactivateMutation, t],
  )

  if (role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
        <h1 className="text-2xl font-bold text-error-text mb-3">
          {t('audit.forbidden')}
        </h1>
        <p className="text-base text-steel">{t('audit.forbiddenMessage')}</p>
      </div>
    )
  }

  const users = data?.data ?? []
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1
  const roleOptions: Array<{
    value: 'superadmin' | 'owner' | 'manager' | ''
    label: string
  }> = [
    { value: '', label: t('adminUsers.allRoles') },
    { value: 'owner', label: 'Owner' },
    { value: 'manager', label: 'Manager' },
    { value: 'superadmin', label: 'Superadmin' },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-ink">{t('adminUsers.title')}</h1>
      </div>

      {isError && (
        <ErrorFeedback
          message={error?.message || t('adminUsers.loadError')}
          type="error"
          visible
        />
      )}

      <div className="flex gap-3 mb-4 p-3 rounded-lg border border-hairline">
        <div className="min-w-[150px] flex-1">
          <label
            htmlFor="role-filter"
            className="block text-xs font-medium text-steel mb-1"
          >
            {t('adminUsers.role')}
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(
                e.target.value as 'superadmin' | 'owner' | 'manager' | '',
              )
              setPage(1)
            }}
            className="w-full px-3 py-2 text-sm rounded-md border border-hairline bg-canvas text-ink min-h-11"
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} showHeader />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-hairline">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface">
                  <TableHead className="text-steel font-semibold text-xs uppercase tracking-wide">
                    {t('adminUsers.name')}
                  </TableHead>
                  <TableHead className="text-steel font-semibold text-xs uppercase tracking-wide">
                    {t('adminUsers.email')}
                  </TableHead>
                  <TableHead className="text-steel font-semibold text-xs uppercase tracking-wide">
                    {t('adminUsers.role')}
                  </TableHead>
                  <TableHead className="text-steel font-semibold text-xs uppercase tracking-wide">
                    {t('adminUsers.status')}
                  </TableHead>
                  <TableHead className="text-steel font-semibold text-xs uppercase tracking-wide">
                    {t('adminUsers.signupDate')}
                  </TableHead>
                  <TableHead className="text-steel font-semibold text-xs uppercase tracking-wide">
                    &nbsp;
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow className="bg-canvas">
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-steel"
                    >
                      {t('adminUsers.noUsers')}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="bg-canvas text-ink border-b border-hairline-soft"
                    >
                      <TableCell className="py-3 px-4 font-medium">
                        {user.name || '—'}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-steel">
                        {user.email}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <span className="capitalize">{user.role}</span>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {user.approvalStatus === 'approved' ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-xs font-semibold">
                            {t('adminUsers.active')}
                          </span>
                        ) : user.approvalStatus === 'rejected' ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-xs font-semibold">
                            {t('adminUsers.inactive')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 px-2.5 py-0.5 text-xs font-semibold">
                            {user.approvalStatus || '—'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-sm text-steel">
                        {new Date(user.createdAt).toLocaleDateString('bn-BD')}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {user.role !== 'superadmin' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="min-h-9 rounded-full"
                            disabled={deactivateMutation.isPending}
                            onClick={() => handleDeactivate(user.id, user.name)}
                          >
                            {t('adminUsers.deactivate')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-steel">
              <span>
                {data.page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full min-w-[44px] min-h-11"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full min-w-[44px] min-h-11"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
