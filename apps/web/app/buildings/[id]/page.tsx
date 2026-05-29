'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  useBuilding,
  useBuildingFlats,
  useUpdateBuilding,
} from '@/hooks/use-buildings'
import type { FlatSummary } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * Building detail page — /buildings/[id]
 * Shows building info with flat list.
 * Owner can edit building, Manager can only view.
 * Validates: Requirements 5.4, 5.5, 5.8
 */
export default function BuildingDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const router = useRouter()
  const buildingId = params.id as string

  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [flatPage, setFlatPage] = useState(1)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editFloors, setEditFloors] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const { data: building, isLoading, isError, error } = useBuilding(buildingId)
  const { data: flatsData, isLoading: isLoadingFlats } = useBuildingFlats(
    buildingId,
    flatPage,
    50,
  )
  const updateMutation = useUpdateBuilding(buildingId)

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

  // Populate edit form when building data loads
  useEffect(() => {
    if (building) {
      setEditName(building.name)
      setEditAddress(building.address)
      setEditFloors(building.totalFloors?.toString() ?? '')
    }
  }, [building])

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!editName.trim()) {
      newErrors.name = t('buildings.buildingNameRequired')
    } else if (editName.trim().length > 200) {
      newErrors.name = t('buildings.buildingNameMaxLength')
    }

    if (!editAddress.trim()) {
      newErrors.address = t('buildings.addressRequired')
    } else if (editAddress.trim().length > 500) {
      newErrors.address = t('buildings.addressMaxLength')
    }

    if (editFloors.trim()) {
      const floors = Number.parseInt(editFloors, 10)
      if (Number.isNaN(floors) || floors < 1 || floors > 200) {
        newErrors.totalFloors = t('buildings.totalFloorsRange')
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      await updateMutation.mutateAsync({
        name: editName.trim(),
        address: editAddress.trim(),
        totalFloors: editFloors.trim() ? Number.parseInt(editFloors, 10) : null,
      })
      setSuccessMessage(t('buildings.updateSuccess'))
      setIsEditing(false)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : t('buildings.saveError'),
      })
    }
  }

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
  const isOwner = role === 'owner'

  const flatColumns: DataTableColumn<FlatSummary>[] = [
    {
      key: 'flatNumber',
      header: t('flats.flatNumber'),
      render: (row) => (
        <Link
          href={`/flats/${row.id}`}
          className="text-brand-blue-deep font-medium no-underline hover:underline"
        >
          {row.flatNumber}
        </Link>
      ),
    },
    {
      key: 'floor',
      header: t('flats.floor'),
      render: (row) => <span>{row.floor}</span>,
      width: '100px',
    },
    {
      key: 'status',
      header: t('flats.status'),
      render: (row) => <StatusBadge status={row.status} />,
      width: '160px',
    },
  ]

  return (
    <DashboardLayout role={role} activePath="/buildings">
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
      {isError && (
        <ErrorFeedback
          message={error?.message || t('buildings.loadError')}
          type="error"
          visible
        />
      )}

      <div className="mb-6">
        <a
          href="/buildings"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </a>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} showHeader />
      ) : building ? (
        <>
          {/* Building Info Section */}
          <Card className="bg-canvas border-hairline mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-ink">
                  {isEditing
                    ? t('buildings.editBuilding')
                    : t('buildings.buildingDetail')}
                </h1>

                {isOwner && !isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="rounded-full min-h-[44px] text-brand-blue-deep border-brand-blue-deep"
                  >
                    {t('common.edit')}
                  </Button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdate} className="max-w-lg">
                  <FormField
                    label={t('buildings.buildingName')}
                    required
                    error={errors.name}
                    htmlFor="edit-building-name"
                  >
                    <FormInput
                      id="edit-building-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      hasError={!!errors.name}
                      maxLength={200}
                    />
                  </FormField>

                  <FormField
                    label={t('buildings.address')}
                    required
                    error={errors.address}
                    htmlFor="edit-building-address"
                  >
                    <FormInput
                      id="edit-building-address"
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      hasError={!!errors.address}
                      maxLength={500}
                    />
                  </FormField>

                  <FormField
                    label={t('buildings.totalFloors')}
                    error={errors.totalFloors}
                    htmlFor="edit-building-floors"
                  >
                    <FormInput
                      id="edit-building-floors"
                      type="number"
                      value={editFloors}
                      onChange={(e) => setEditFloors(e.target.value)}
                      hasError={!!errors.totalFloors}
                      min={1}
                      max={200}
                    />
                  </FormField>

                  <div className="flex gap-3 mt-6">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="rounded-full min-h-[44px] bg-primary text-on-primary font-semibold"
                    >
                      {updateMutation.isPending
                        ? t('common.loading')
                        : t('common.save')}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false)
                        setErrors({})
                        // Reset to original values
                        if (building) {
                          setEditName(building.name)
                          setEditAddress(building.address)
                          setEditFloors(building.totalFloors?.toString() ?? '')
                        }
                      }}
                      className="rounded-full min-h-[44px] text-charcoal border-hairline"
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                  <div>
                    <p className="text-xs font-medium text-steel mb-1">
                      {t('buildings.buildingName')}
                    </p>
                    <p className="text-base font-semibold text-ink">
                      {building.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-steel mb-1">
                      {t('buildings.address')}
                    </p>
                    <p className="text-base text-ink">{building.address}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-steel mb-1">
                      {t('buildings.totalFloors')}
                    </p>
                    <p className="text-base text-ink">
                      {building.totalFloors ?? '—'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flats Section */}
          <div>
            <h2 className="text-xl font-semibold text-ink mb-4">
              {t('buildings.flatsInBuilding')}
            </h2>

            {isLoadingFlats ? (
              <LoadingSkeleton rows={5} showHeader />
            ) : (
              <DataTable<FlatSummary>
                columns={flatColumns}
                data={flatsData?.data ?? []}
                getRowKey={(row) => row.id}
                pagination={
                  flatsData
                    ? {
                        total: flatsData.total,
                        page: flatsData.page,
                        pageSize: flatsData.pageSize,
                      }
                    : undefined
                }
                onPageChange={setFlatPage}
                loading={isLoadingFlats}
                emptyMessage={t('flats.noFlats')}
              />
            )}
          </div>
        </>
      ) : null}
    </DashboardLayout>
  )
}
