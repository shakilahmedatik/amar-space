'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useSession } from '@/contexts/session-context'
import { useBuildings } from '@/hooks/use-buildings'
import {
  useDeactivateStaff,
  useDeleteStaff,
  useReactivateStaff,
  useStaffMember,
  useUpdateStaff,
  useUpdateStaffPermissions,
} from '@/hooks/use-staff'
import { useTranslation } from '@/lib/i18n'

const ROLE_LABELS: Record<string, { bn: string; en: string }> = {
  manager: { bn: 'ম্যানেজার', en: 'Manager' },
  security_guard: { bn: 'সিকিউরিটি গার্ড', en: 'Security Guard' },
  care_taker: { bn: 'কেয়ার টেকার', en: 'Care Taker' },
}

const ROLE_OPTIONS = [
  { value: 'manager', labelBn: 'ম্যানেজার', labelEn: 'Manager' },
  {
    value: 'security_guard',
    labelBn: 'সিকিউরিটি গার্ড',
    labelEn: 'Security Guard',
  },
  { value: 'care_taker', labelBn: 'কেয়ার টেকার', labelEn: 'Care Taker' },
]

type Tab = 'profile' | 'permissions'

const PERMISSION_GROUP_LABELS: Record<string, { bn: string; en: string }> = {
  buildings: { bn: 'ভবন', en: 'Buildings' },
  flats: { bn: 'ফ্ল্যাট', en: 'Flats' },
  renters: { bn: 'ভাড়াটিয়া', en: 'Renters' },
  bills: { bn: 'বিল', en: 'Bills' },
  payments: { bn: 'পেমেন্ট', en: 'Payments' },
  deposits: { bn: 'জমা', en: 'Deposits' },
  maintenance: { bn: 'রক্ষণাবেক্ষণ', en: 'Maintenance' },
  issues: { bn: 'সমস্যা', en: 'Issues' },
  notices: { bn: 'নোটিশ', en: 'Notices' },
  audit: { bn: 'অডিট', en: 'Audit' },
  roles: { bn: 'রোল', en: 'Roles' },
  staff: { bn: 'স্টাফ', en: 'Staff' },
}

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { role: userRole } = useSession()
  const { t, locale } = useTranslation()

  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState('')
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([])
  const [permissionOverrides, setPermissionOverrides] = useState<
    Record<string, 'grant' | 'deny'>
  >({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: staff, isLoading, isError, error } = useStaffMember(id)
  const { data: buildingsData } = useBuildings(1, 100)
  const updateMutation = useUpdateStaff(id)
  const deactivateMutation = useDeactivateStaff()
  const reactivateMutation = useReactivateStaff()
  const deleteMutation = useDeleteStaff()
  const permissionsMutation = useUpdateStaffPermissions(id)

  const isOwner = userRole === 'owner'
  const buildings = buildingsData?.data ?? []

  useEffect(() => {
    if (staff) {
      setEditName(staff.name)
      setEditPhone(staff.phone ?? '')
      setEditRole(staff.role)
      const overridesMap: Record<string, 'grant' | 'deny'> = {}
      for (const o of staff.permissionOverrides) {
        overridesMap[o.permissionKey] = o.effect as 'grant' | 'deny'
      }
      setPermissionOverrides(overridesMap)
    }
  }, [staff])

  function toggleBuilding(buildingId: string) {
    setSelectedBuildingIds((prev) =>
      prev.includes(buildingId)
        ? prev.filter((id) => id !== buildingId)
        : [...prev, buildingId],
    )
  }

  function cyclePermission(key: string) {
    setPermissionOverrides((prev) => {
      const current = prev[key]
      // Default → Grant → Deny → Default
      if (!current) return { ...prev, [key]: 'grant' }
      if (current === 'grant') return { ...prev, [key]: 'deny' }
      // deny → remove override (back to default)
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function handleSaveProfile() {
    try {
      await updateMutation.mutateAsync({
        name: editName.trim(),
        phone: editPhone.trim() || null,
        role: editRole,
        buildingIds: selectedBuildingIds,
      })
      setSuccessMessage(t('staff.updateSuccess') || 'Profile updated')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Could not update staff',
      })
    }
  }

  async function handleDeactivate() {
    try {
      await deactivateMutation.mutateAsync(id)
      setShowDeactivateDialog(false)
      setSuccessMessage(
        t('staff.deactivateSuccess') || 'Staff member deactivated',
      )
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Could not deactivate staff',
      })
    }
  }

  async function handleReactivate() {
    try {
      await reactivateMutation.mutateAsync(id)
      setSuccessMessage(
        t('staff.reactivateSuccess') || 'Staff member reactivated',
      )
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Could not reactivate staff',
      })
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(id)
      setShowDeleteDialog(false)
      setSuccessMessage(
        t('staff.deleteSuccess') || 'Staff member permanently deleted',
      )
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Could not delete staff',
      })
    }
  }

  async function handleSavePermissions() {
    try {
      const overrides = Object.entries(permissionOverrides).map(
        ([permissionKey, effect]) => ({
          permissionKey,
          effect,
        }),
      )
      await permissionsMutation.mutateAsync({ overrides })
      setSuccessMessage(
        t('staff.permissionsUpdateSuccess') || 'Permissions updated',
      )
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrors({
        form:
          err instanceof Error ? err.message : 'Could not update permissions',
      })
    }
  }

  if (isLoading) {
    return <LoadingSkeleton rows={10} showHeader />
  }

  if (isError) {
    return (
      <ErrorFeedback
        message={error?.message || 'Could not load staff data'}
        type="error"
        visible
      />
    )
  }

  if (!staff) {
    return (
      <ErrorFeedback message="Staff member not found" type="error" visible />
    )
  }

  const roleLabel =
    locale === 'bn'
      ? (ROLE_LABELS[staff.role]?.bn ?? staff.role)
      : (ROLE_LABELS[staff.role]?.en ?? staff.role)

  const permissionGroups = groupPermissions(staff.permissions)

  return (
    <>
      {successMessage && (
        <ErrorFeedback
          message={successMessage}
          type="success"
          visible
          onDismiss={() => setSuccessMessage('')}
        />
      )}
      {errors.form && (
        <ErrorFeedback
          message={errors.form}
          type="error"
          visible
          onDismiss={() => setErrors((prev) => ({ ...prev, form: '' }))}
        />
      )}

      <div className="mb-6">
        <Link
          href="/staff"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{staff.name}</h1>
          <p className="text-steel text-sm">{staff.email}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="outline" className="rounded-full font-medium">
            {roleLabel}
          </Badge>
          {staff.isActive ? (
            <StatusBadge status="active" />
          ) : (
            <StatusBadge status="inactive" />
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-hairline">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'border-brand-blue-deep text-brand-blue-deep'
              : 'border-transparent text-steel hover:text-ink'
          }`}
        >
          {t('renters.personalInfo') || 'Profile'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'permissions'
              ? 'border-brand-blue-deep text-brand-blue-deep'
              : 'border-transparent text-steel hover:text-ink'
          }`}
        >
          {t('staff.permissions') || 'Permissions'}
        </button>
      </div>

      {activeTab === 'profile' && (
        <Card className="max-w-2xl bg-canvas border-hairline">
          <CardContent className="p-6">
            <div className="space-y-4">
              <FormField
                label={t('common.name') || 'Name'}
                required
                error={errors.name}
                htmlFor="edit-name"
              >
                <FormInput
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  hasError={!!errors.name}
                  maxLength={200}
                />
              </FormField>

              <FormField
                label={t('common.phone') || 'Phone'}
                error={errors.phone}
                htmlFor="edit-phone"
              >
                <FormInput
                  id="edit-phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  hasError={!!errors.phone}
                  maxLength={20}
                  placeholder="01XXXXXXXXX"
                />
              </FormField>

              <FormField
                label={t('common.role') || 'Role'}
                required
                error={errors.role}
                htmlFor="edit-role"
              >
                <select
                  id="edit-role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full rounded-md border border-hairline min-h-11 px-3 bg-white text-ink text-sm"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {locale === 'bn' ? opt.labelBn : opt.labelEn}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label={t('nav.buildings')} htmlFor="edit-buildings">
                <div
                  id="edit-buildings"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-hairline rounded-md p-3"
                >
                  {buildings.length === 0 && (
                    <p className="text-sm text-steel col-span-full">
                      {t('buildings.noBuildings')}
                    </p>
                  )}
                  {buildings.map((building) => (
                    <label
                      key={building.id}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm transition-colors ${
                        selectedBuildingIds.includes(building.id)
                          ? 'border-brand-blue-deep bg-brand-blue-200/10'
                          : 'border-hairline hover:bg-surface'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedBuildingIds.includes(building.id)}
                        onChange={() => toggleBuilding(building.id)}
                        className="rounded border-hairline text-brand-blue-deep focus:ring-brand/50"
                      />
                      {building.name}
                    </label>
                  ))}
                </div>
              </FormField>

              <div className="flex gap-2 items-center pt-4">
                <span className="text-sm text-steel">
                  {t('settings.memberSince') || 'Created'}:
                </span>
                <span className="text-sm text-ink">
                  {new Date(staff.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {isOwner && (
              <div className="flex gap-3 mt-8 border-t border-hairline pt-6">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateMutation.isPending}
                  className="rounded-full min-h-11 bg-primary text-on-primary font-semibold cursor-pointer"
                >
                  {updateMutation.isPending
                    ? t('common.loading')
                    : t('common.save')}
                </Button>

                {staff.isActive ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeactivateDialog(true)}
                    className="rounded-full min-h-11 text-error-text border-error-text cursor-pointer"
                  >
                    {t('staff.deactivate') || 'Deactivate'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleReactivate}
                    disabled={reactivateMutation.isPending}
                    className="rounded-full min-h-11 text-brand-green border-brand-green cursor-pointer"
                  >
                    {reactivateMutation.isPending
                      ? t('common.loading')
                      : t('staff.reactivate') || 'Reactivate'}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  className="rounded-full min-h-11 text-error-text border-error-text cursor-pointer"
                >
                  {t('common.delete') || 'Delete'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'permissions' && (
        <Card className="max-w-2xl bg-canvas border-hairline">
          <CardContent className="p-6">
            <p className="text-sm text-steel mb-4">
              {t('staff.permissionsDescription') ||
                'Grant or deny specific permissions beyond the role defaults. Click Grant or Deny to override. Click again to remove the override and revert to default.'}
            </p>

            <div className="space-y-6">
              {permissionGroups.map((group) => {
                const groupName = group.key
                const groupLabel =
                  locale === 'bn'
                    ? (PERMISSION_GROUP_LABELS[groupName]?.bn ?? groupName)
                    : (PERMISSION_GROUP_LABELS[groupName]?.en ?? groupName)

                return (
                  <div key={groupName}>
                    <h3 className="text-sm font-semibold text-ink mb-2 uppercase tracking-wide">
                      {groupLabel}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {group.permissions.map((perm) => {
                        const override = permissionOverrides[perm.key]

                        return (
                          <div
                            key={perm.key}
                            className="flex items-center gap-1 border border-hairline rounded-full px-1 py-0.5"
                          >
                            <span
                              className="text-xs px-2 text-steel font-medium whitespace-nowrap"
                              title={`${perm.label} (${perm.key})`}
                            >
                              {perm.label}
                            </span>
                            <div className="flex gap-0.5">
                              <button
                                type="button"
                                onClick={() => cyclePermission(perm.key)}
                                className={`text-[11px] px-2 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                  override === 'grant'
                                    ? 'bg-green-100 text-green-800'
                                    : 'text-steel hover:text-green-700 hover:bg-green-50'
                                }`}
                              >
                                +Grant
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPermissionOverrides((prev) => {
                                    if (prev[perm.key] === 'deny') {
                                      const next = { ...prev }
                                      delete next[perm.key]
                                      return next
                                    }
                                    return { ...prev, [perm.key]: 'deny' }
                                  })
                                }}
                                className={`text-[11px] px-2 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                  override === 'deny'
                                    ? 'bg-red-100 text-red-800'
                                    : 'text-steel hover:text-red-700 hover:bg-red-50'
                                }`}
                              >
                                −Deny
                              </button>
                              {override && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPermissionOverrides((prev) => {
                                      const next = { ...prev }
                                      delete next[perm.key]
                                      return next
                                    })
                                  }}
                                  className="text-[11px] px-1.5 py-1 rounded-full font-medium text-steel hover:text-ink transition-colors cursor-pointer"
                                  title="Remove override (revert to default)"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {isOwner && (
              <div className="flex gap-3 mt-8 border-t border-hairline pt-6">
                <Button
                  onClick={handleSavePermissions}
                  disabled={permissionsMutation.isPending}
                  className="rounded-full min-h-11 bg-primary text-on-primary font-semibold cursor-pointer"
                >
                  {permissionsMutation.isPending
                    ? t('common.loading')
                    : t('common.save')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
        title={t('staff.deactivateConfirmTitle') || 'Deactivate Staff Member'}
        description={
          t('staff.deactivateConfirmDescription') ||
          'This staff member will no longer be able to log in. You can reactivate them later.'
        }
        confirmLabel={t('staff.deactivate') || 'Deactivate'}
        onConfirm={handleDeactivate}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title={
          t('staff.deleteConfirmTitle') || 'Permanently Delete Staff Member'
        }
        description={
          t('staff.deleteConfirmDescription') ||
          'This action permanently deletes this staff member and all associated data. It cannot be undone.'
        }
        confirmLabel={t('common.delete') || 'Delete'}
        onConfirm={handleDelete}
      />
    </>
  )
}

interface GroupedPermissions {
  key: string
  permissions: Array<{ key: string; label: string }>
}

function groupPermissions(allPermissions: string[]): GroupedPermissions[] {
  const groups: Record<string, Array<{ key: string; label: string }>> = {}

  for (const perm of allPermissions) {
    const [group, action] = perm.split(':')
    if (!group || !action) continue
    if (!groups[group]) groups[group] = []
    const label = action.charAt(0).toUpperCase() + action.slice(1)
    groups[group].push({ key: perm, label })
  }

  return Object.entries(groups).map(([key, permissions]) => ({
    key,
    permissions,
  }))
}
