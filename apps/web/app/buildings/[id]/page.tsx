'use client'

import { useParams } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
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
      <div className="flex h-dvh items-center justify-center bg-gray-50">
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
        <a
          href={`/flats/${row.id}`}
          style={{
            color: '#2563eb',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          {row.flatNumber}
        </a>
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

      <div style={{ marginBottom: '1.5rem' }}>
        <a
          href="/buildings"
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            textDecoration: 'none',
          }}
        >
          ← {t('common.back')}
        </a>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} showHeader />
      ) : building ? (
        <>
          {/* Building Info Section */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                {isEditing
                  ? t('buildings.editBuilding')
                  : t('buildings.buildingDetail')}
              </h1>

              {isOwner && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '44px',
                    minHeight: '44px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    borderRadius: '0.375rem',
                    backgroundColor: 'transparent',
                    color: '#2563eb',
                    border: '1px solid #2563eb',
                    cursor: 'pointer',
                  }}
                >
                  {t('common.edit')}
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdate} style={{ maxWidth: '32rem' }}>
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

                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    marginTop: '1.5rem',
                  }}
                >
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: '0.625rem 1.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      borderRadius: '0.5rem',
                      backgroundColor: updateMutation.isPending
                        ? '#93c5fd'
                        : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      cursor: updateMutation.isPending
                        ? 'not-allowed'
                        : 'pointer',
                    }}
                  >
                    {updateMutation.isPending
                      ? t('common.loading')
                      : t('common.save')}
                  </button>

                  <button
                    type="button"
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
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: '0.625rem 1.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: '0.5rem',
                      backgroundColor: 'transparent',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      cursor: 'pointer',
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gap: '1rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {t('buildings.buildingName')}
                  </p>
                  <p
                    style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#111827',
                    }}
                  >
                    {building.name}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {t('buildings.address')}
                  </p>
                  <p
                    style={{
                      fontSize: '1rem',
                      color: '#111827',
                    }}
                  >
                    {building.address}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {t('buildings.totalFloors')}
                  </p>
                  <p
                    style={{
                      fontSize: '1rem',
                      color: '#111827',
                    }}
                  >
                    {building.totalFloors ?? '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Flats Section */}
          <div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '1rem',
              }}
            >
              {t('buildings.flatsInBuilding')}
            </h2>

            {isLoadingFlats ? (
              <LoadingSkeleton rows={5} showHeader />
            ) : (
              <DataTable<FlatSummary>
                columns={flatColumns}
                data={flatsData?.data ?? []}
                getRowKey={(row) => row.id}
                pagination={flatsData?.pagination}
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
