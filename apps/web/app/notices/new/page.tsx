'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useBuildings } from '@/hooks/use-buildings'
import { useCreateNotice } from '@/hooks/use-notices'
import type { NoticeTargetAudience } from '@/lib/api-client'
import { fetchFlats } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * New notice form — /notices/new
 * Accessible by Owner and Manager roles.
 * Title (max 200 chars), body (max 5000 chars), target audience, building/flat selection.
 * Validates: Requirements 12.1, 12.3, 12.4, 12.11, 12.12
 */
export default function NewNoticePage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  // Form state
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetAudience, setTargetAudience] = useState<
    NoticeTargetAudience | ''
  >('')
  const [targetBuildingId, setTargetBuildingId] = useState('')
  const [targetFlatId, setTargetFlatId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  // Flat options for specific_flat audience
  const [flatOptions, setFlatOptions] = useState<
    Array<{ id: string; flatNumber: string; buildingName?: string }>
  >([])
  const [loadingFlats, setLoadingFlats] = useState(false)

  const createMutation = useCreateNotice()
  const { data: buildingsData } = useBuildings(1, 100)

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
        // Only Owner and Manager can create notices
        if (session.role === 'renter') {
          window.location.href = '/notices'
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

  // Load flats when building is selected for specific_flat audience
  useEffect(() => {
    async function loadFlats() {
      if (targetAudience === 'specific_flat' && targetBuildingId) {
        setLoadingFlats(true)
        try {
          const response = await fetchFlats({
            buildingId: targetBuildingId,
            pageSize: 100,
          })
          setFlatOptions(
            (response.data ?? []).map((f) => ({
              id: f.id,
              flatNumber: f.flatNumber,
              buildingName: f.buildingName,
            })),
          )
        } catch {
          setFlatOptions([])
        } finally {
          setLoadingFlats(false)
        }
      }
    }
    loadFlats()
  }, [targetAudience, targetBuildingId])

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = t('notices.titleRequired')
    } else if (title.trim().length > 200) {
      newErrors.title = t('notices.titleMaxLength')
    }

    if (!body.trim()) {
      newErrors.body = t('notices.bodyRequired')
    } else if (body.trim().length > 5000) {
      newErrors.body = t('notices.bodyMaxLength')
    }

    if (!targetAudience) {
      newErrors.targetAudience = t('notices.audienceRequired')
    }

    if (targetAudience === 'specific_building' && !targetBuildingId) {
      newErrors.targetBuildingId = t('notices.buildingRequired')
    }

    if (targetAudience === 'specific_flat') {
      if (!targetBuildingId) {
        newErrors.targetBuildingId = t('notices.buildingRequired')
      }
      if (!targetFlatId) {
        newErrors.targetFlatId = t('notices.flatRequired')
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
        title: title.trim(),
        body: body.trim(),
        targetAudience: targetAudience as NoticeTargetAudience,
        targetBuildingId:
          targetAudience === 'specific_building' ||
          targetAudience === 'specific_flat'
            ? targetBuildingId
            : undefined,
        targetFlatId:
          targetAudience === 'specific_flat' ? targetFlatId : undefined,
      })
      setSuccessMessage(t('notices.createSuccess'))
      setTimeout(() => {
        window.location.href = '/notices'
      }, 1500)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : t('notices.createError'),
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

  return (
    <DashboardLayout role={role} activePath="/notices">
      {successMessage && (
        <ErrorFeedback
          message={successMessage}
          type="success"
          visible
          onDismiss={() => setSuccessMessage('')}
        />
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <a
          href="/notices"
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            textDecoration: 'none',
          }}
        >
          ← {t('common.back')}
        </a>
      </div>

      <div
        style={{
          padding: '1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          maxWidth: '640px',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '1.5rem',
          }}
        >
          {t('notices.createNotice')}
        </h1>

        {errors.form && (
          <p
            style={{
              fontSize: '0.875rem',
              color: '#dc2626',
              marginBottom: '1rem',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: '#fef2f2',
            }}
          >
            {errors.form}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: '1.25rem' }}>
            <FormField
              label={t('notices.noticeTitle')}
              required
              error={errors.title}
              htmlFor="notice-title"
            >
              <FormInput
                id="notice-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                hasError={!!errors.title}
                maxLength={200}
                placeholder={t('notices.titlePlaceholder')}
              />
            </FormField>
            <p
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem',
              }}
            >
              {title.length}/200
            </p>
          </div>

          {/* Body */}
          <div style={{ marginBottom: '1.25rem' }}>
            <FormField
              label={t('notices.body')}
              required
              error={errors.body}
              htmlFor="notice-body"
            >
              <textarea
                id="notice-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                rows={8}
                placeholder={t('notices.bodyPlaceholder')}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${errors.body ? '#dc2626' : '#d1d5db'}`,
                  minHeight: '44px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </FormField>
            <p
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem',
              }}
            >
              {body.length}/5000
            </p>
          </div>

          {/* Target Audience */}
          <div style={{ marginBottom: '1.25rem' }}>
            <FormField
              label={t('notices.targetAudience')}
              required
              error={errors.targetAudience}
              htmlFor="notice-audience"
            >
              <select
                id="notice-audience"
                value={targetAudience}
                onChange={(e) => {
                  setTargetAudience(e.target.value as NoticeTargetAudience | '')
                  setTargetBuildingId('')
                  setTargetFlatId('')
                  setFlatOptions([])
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${errors.targetAudience ? '#dc2626' : '#d1d5db'}`,
                  minHeight: '44px',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="">{t('notices.selectAudience')}</option>
                <option value="all_renters">{t('notices.allRenters')}</option>
                <option value="specific_building">
                  {t('notices.specificBuilding')}
                </option>
                <option value="specific_flat">
                  {t('notices.specificFlat')}
                </option>
                <option value="managers_only">
                  {t('notices.managersOnly')}
                </option>
              </select>
            </FormField>
          </div>

          {/* Building Selection (for specific_building or specific_flat) */}
          {(targetAudience === 'specific_building' ||
            targetAudience === 'specific_flat') && (
            <div style={{ marginBottom: '1.25rem' }}>
              <FormField
                label={t('notices.building')}
                required
                error={errors.targetBuildingId}
                htmlFor="notice-building"
              >
                <select
                  id="notice-building"
                  value={targetBuildingId}
                  onChange={(e) => {
                    setTargetBuildingId(e.target.value)
                    setTargetFlatId('')
                    setFlatOptions([])
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    border: `1px solid ${errors.targetBuildingId ? '#dc2626' : '#d1d5db'}`,
                    minHeight: '44px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">{t('notices.selectBuilding')}</option>
                  {(buildingsData?.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          )}

          {/* Flat Selection (for specific_flat) */}
          {targetAudience === 'specific_flat' && targetBuildingId && (
            <div style={{ marginBottom: '1.25rem' }}>
              <FormField
                label={t('notices.flat')}
                required
                error={errors.targetFlatId}
                htmlFor="notice-flat"
              >
                <select
                  id="notice-flat"
                  value={targetFlatId}
                  onChange={(e) => setTargetFlatId(e.target.value)}
                  disabled={loadingFlats}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.375rem',
                    border: `1px solid ${errors.targetFlatId ? '#dc2626' : '#d1d5db'}`,
                    minHeight: '44px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">{t('notices.selectFlat')}</option>
                  {flatOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.flatNumber}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          )}

          {/* Submit */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
            }}
          >
            <a
              href="/notices"
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
                color: '#374151',
                border: '1px solid #d1d5db',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              {t('common.cancel')}
            </a>
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '44px',
                minHeight: '44px',
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                borderRadius: '0.375rem',
                backgroundColor: createMutation.isPending
                  ? '#93c5fd'
                  : '#2563eb',
                color: '#ffffff',
                border: 'none',
                cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {createMutation.isPending
                ? t('common.loading')
                : t('common.submit')}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
