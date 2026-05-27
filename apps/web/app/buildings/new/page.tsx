'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useCreateBuilding } from '@/hooks/use-buildings'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

/**
 * Building creation page — /buildings/new
 * Form with name and address validation.
 * Only accessible by Owner role.
 * Validates: Requirements 5.1, 5.2
 */
export default function NewBuildingPage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [totalFloors, setTotalFloors] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const createMutation = useCreateBuilding()

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
        // Only owners can create buildings
        if (session.role !== 'owner') {
          window.location.href = '/buildings'
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

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = t('buildings.buildingNameRequired')
    } else if (name.trim().length > 200) {
      newErrors.name = t('buildings.buildingNameMaxLength')
    }

    if (!address.trim()) {
      newErrors.address = t('buildings.addressRequired')
    } else if (address.trim().length > 500) {
      newErrors.address = t('buildings.addressMaxLength')
    }

    if (totalFloors.trim()) {
      const floors = Number.parseInt(totalFloors, 10)
      if (Number.isNaN(floors) || floors < 1 || floors > 200) {
        newErrors.totalFloors = t('buildings.totalFloorsRange')
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        address: address.trim(),
        totalFloors: totalFloors.trim()
          ? Number.parseInt(totalFloors, 10)
          : null,
      })
      setSuccessMessage(t('buildings.createSuccess'))
      // Redirect to buildings list after short delay
      setTimeout(() => {
        window.location.href = '/buildings'
      }, 1000)
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

  return (
    <DashboardLayout role={user.role as 'owner'} activePath="/buildings">
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

      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '1.5rem',
        }}
      >
        {t('buildings.createBuilding')}
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: '32rem',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
        }}
      >
        <FormField
          label={t('buildings.buildingName')}
          required
          error={errors.name}
          htmlFor="building-name"
        >
          <FormInput
            id="building-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            hasError={!!errors.name}
            maxLength={200}
            autoFocus
          />
        </FormField>

        <FormField
          label={t('buildings.address')}
          required
          error={errors.address}
          htmlFor="building-address"
        >
          <FormInput
            id="building-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            hasError={!!errors.address}
            maxLength={500}
          />
        </FormField>

        <FormField
          label={t('buildings.totalFloors')}
          error={errors.totalFloors}
          htmlFor="building-floors"
        >
          <FormInput
            id="building-floors"
            type="number"
            value={totalFloors}
            onChange={(e) => setTotalFloors(e.target.value)}
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
            disabled={createMutation.isPending}
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
              backgroundColor: createMutation.isPending ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {createMutation.isPending
              ? t('common.loading')
              : t('common.create')}
          </button>

          <a
            href="/buildings"
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
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </a>
        </div>
      </form>
    </DashboardLayout>
  )
}
