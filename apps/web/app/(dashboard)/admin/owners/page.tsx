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
import { useAdminOwners, useUpdateOwnerApproval } from '@/hooks/use-admin'
import { useTranslation } from '@/lib/i18n'

export default function AdminOwnersPage() {
  const { role } = useSession()
  const { t } = useTranslation()
  const [statusFilter, setStatusFilter] = useState<
    'pending' | 'approved' | 'rejected' | ''
  >('')
  const { data, isLoading, isError, error } = useAdminOwners({
    status: statusFilter || undefined,
  })
  const updateApproval = useUpdateOwnerApproval()

  const handleStatusChange = useCallback(
    (newStatus: 'approved' | 'rejected') => {
      return (ownerId: string) => {
        const confirmMsg =
          newStatus === 'approved'
            ? t('adminOwners.confirmApprove')
            : t('adminOwners.confirmReject')
        if (window.confirm(confirmMsg)) {
          updateApproval.mutate(
            { ownerId, newStatus },
            {
              onSuccess: () => {},
            },
          )
        }
      }
    },
    [updateApproval, t],
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

  const owners = data?.data ?? []
  const statusOptions: Array<{
    value: 'pending' | 'approved' | 'rejected' | ''
    label: string
  }> = [
    { value: '', label: t('adminOwners.allStatuses') },
    { value: 'pending', label: t('adminOwners.pending') },
    { value: 'approved', label: t('adminOwners.approved') },
    { value: 'rejected', label: t('adminOwners.rejected') },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-ink">
          {t('adminOwners.title')}
        </h1>
      </div>

      {isError && (
        <ErrorFeedback
          message={error?.message || t('adminOwners.loadError')}
          type="error"
          visible
        />
      )}

      <div className="flex gap-3 mb-4 p-3 rounded-lg border border-hairline">
        <div className="min-w-[150px] flex-1">
          <label
            htmlFor="status-filter"
            className="block text-xs font-medium text-steel mb-1"
          >
            {t('adminOwners.status')}
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as 'pending' | 'approved' | 'rejected' | '',
              )
            }
            className="w-full px-3 py-2 text-sm rounded-md border border-hairline bg-canvas text-ink min-h-11"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} showHeader />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline">
          <Table>
            <TableHeader>
              <TableRow className="bg-surface">
                <TableHead className="text-steel font-semibold text-xs uppercase tracking-wide">
                  {t('adminOwners.name')}
                </TableHead>
                <TableHead className="text-steel font-semibold text-xs uppercase tracking-wide">
                  {t('adminOwners.email')}
                </TableHead>
                <TableHead className="text-steel font-semibold text-xs uppercase tracking-wide">
                  {t('adminOwners.signupDate')}
                </TableHead>
                <TableHead className="text-steel font-semibold text-xs uppercase tracking-wide">
                  {t('adminOwners.status')}
                </TableHead>
                <TableHead className="text-steel font-semibold text-xs uppercase tracking-wide">
                  &nbsp;
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.length === 0 ? (
                <TableRow className="bg-canvas">
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-steel"
                  >
                    {t('adminOwners.noOwners')}
                  </TableCell>
                </TableRow>
              ) : (
                owners.map((owner) => (
                  <TableRow
                    key={owner.id}
                    className="bg-canvas text-ink border-b border-hairline-soft"
                  >
                    <TableCell className="py-3 px-4 font-medium">
                      {owner.name}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-steel">
                      {owner.email}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-sm text-steel">
                      {new Date(owner.createdAt).toLocaleDateString('bn-BD')}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <StatusBadge status={owner.approvalStatus} t={t} />
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {owner.approvalStatus === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="min-h-9 rounded-full bg-primary text-on-primary"
                            disabled={updateApproval.isPending}
                            onClick={() =>
                              handleStatusChange('approved')(owner.id)
                            }
                          >
                            {t('adminOwners.approve')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="min-h-9 rounded-full"
                            disabled={updateApproval.isPending}
                            onClick={() =>
                              handleStatusChange('rejected')(owner.id)
                            }
                          >
                            {t('adminOwners.reject')}
                          </Button>
                        </div>
                      )}
                      {owner.approvalStatus === 'approved' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-9 rounded-full"
                          disabled={updateApproval.isPending}
                          onClick={() =>
                            handleStatusChange('rejected')(owner.id)
                          }
                        >
                          {t('adminOwners.reject')}
                        </Button>
                      )}
                      {owner.approvalStatus === 'rejected' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-9 rounded-full"
                          disabled={updateApproval.isPending}
                          onClick={() =>
                            handleStatusChange('approved')(owner.id)
                          }
                        >
                          {t('adminOwners.approve')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}

function StatusBadge({
  status,
  t,
}: {
  status: string | null
  t: (key: string) => string
}) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-xs font-semibold">
        {t('adminOwners.approved')}
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-xs font-semibold">
        {t('adminOwners.rejected')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 px-2.5 py-0.5 text-xs font-semibold">
      {t('adminOwners.pending')}
    </span>
  )
}
