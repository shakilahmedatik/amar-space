'use client'

import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useBuildings, useCreateFlat } from '@/hooks/use-flats'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Flat creation form page — /flats/new
 * Allows Owner to create a new flat with flat number, floor, and building reference.
 * Validates: Requirements 6.1, 6.2
 */
export default function CreateFlatPage() {
  const { t } = useTranslation()
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [flatNumber, setFlatNumber] = useState('')
  const [floor, setFloor] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const { data: buildingsData, isLoading: buildingsLoading } = useBuildings()
  const createFlatMutation = useCreateFlat()

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
        // Only owners can create flats
        if (session.role !== 'owner') {
          window.location.href = '/flats'
          return
        }
      } catch {
        window.location.href = '/login'
      } finally {
        setIsLoadingSession(false)
      }
    }
    loadSession()
  }, [])

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!flatNumber.trim()) {
      newErrors.flatNumber = t('flats.flatNumberRequired')
    }

    const floorNum = Number.parseInt(floor, 10)
    if (!floor.trim()) {
      newErrors.floor = t('flats.floorRequired')
    } else if (Number.isNaN(floorNum) || floorNum < 1) {
      newErrors.floor = t('flats.floorMin')
    } else if (floorNum > 200) {
      newErrors.floor = t('flats.floorMax')
    }

    if (!buildingId) {
      newErrors.buildingId = t('flats.buildingRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [flatNumber, floor, buildingId, t])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!validate()) return

      try {
        await createFlatMutation.mutateAsync({
          flatNumber: flatNumber.trim(),
          floor: Number.parseInt(floor, 10),
          buildingId,
        })
        setSuccessMessage(t('flats.createSuccess'))
        // Reset form
        setFlatNumber('')
        setFloor('')
        setBuildingId('')
        setErrors({})
        // Redirect after short delay
        setTimeout(() => {
          window.location.href = '/flats'
        }, 1500)
      } catch (err) {
        setErrors({
          form: err instanceof Error ? err.message : t('common.error'),
        })
      }
    },
    [validate, flatNumber, floor, buildingId, createFlatMutation, t],
  )

  const ownerRole = 'owner' as const

  if (isLoadingSession) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4">
          <LoadingSkeleton rows={5} showHeader />
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout role={ownerRole} activePath="/flats">
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

      <div style={{ maxWidth: '32rem', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <a
            href="/flats"
            style={{
              color: '#2563eb',
              fontSize: '0.875rem',
              textDecoration: 'none',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            ← {t('common.back')}
          </a>
        </div>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '1.5rem',
          }}
        >
          {t('flats.createFlat')}
        </h1>

        <form onSubmit={handleSubmit}>
          <FormField
            label={t('flats.flatNumber')}
            required
            error={errors.flatNumber}
            htmlFor="flatNumber"
          >
            <FormInput
              id="flatNumber"
              type="text"
              value={flatNumber}
              onChange={(e) => setFlatNumber(e.target.value)}
              maxLength={20}
              hasError={!!errors.flatNumber}
              aria-describedby={
                errors.flatNumber ? 'flatNumber-error' : undefined
              }
            />
          </FormField>

          <FormField
            label={t('flats.floor')}
            required
            error={errors.floor}
            htmlFor="floor"
          >
            <FormInput
              id="floor"
              type="number"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              min={1}
              max={200}
              hasError={!!errors.floor}
              aria-describedby={errors.floor ? 'floor-error' : undefined}
            />
          </FormField>

          <FormField
            label={t('flats.building')}
            required
            error={errors.buildingId}
            htmlFor="buildingId"
          >
            <select
              id="buildingId"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              disabled={buildingsLoading}
              aria-invalid={!!errors.buildingId || undefined}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.625rem 0.75rem',
                fontSize: '1rem',
                lineHeight: '1.5',
                borderRadius: '0.375rem',
                border: `1px solid ${errors.buildingId ? '#dc2626' : '#d1d5db'}`,
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                minHeight: '44px',
              }}
            >
              <option value="">{t('flats.allBuildings')}</option>
              {(buildingsData?.data || []).map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </FormField>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '1.5rem',
            }}
          >
            <a
              href="/flats"
              style={{
                minWidth: '44px',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.625rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                backgroundColor: 'transparent',
                color: 'var(--foreground)',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              {t('common.cancel')}
            </a>
            <button
              type="submit"
              disabled={createFlatMutation.isPending}
              style={{
                minWidth: '44px',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                cursor: createFlatMutation.isPending
                  ? 'not-allowed'
                  : 'pointer',
                opacity: createFlatMutation.isPending ? 0.7 : 1,
              }}
            >
              {createFlatMutation.isPending
                ? t('common.loading')
                : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
