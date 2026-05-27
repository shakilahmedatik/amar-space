'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useBuildings } from '@/hooks/use-buildings'
import { useCreateIssue } from '@/hooks/use-issues'
import type { IssueCategory, IssuePriority } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * New issue form page — /issues/new
 * Allows Owner/Manager to create a building-level issue.
 * Validates: Requirements 11.1, 11.7
 */
export default function NewIssuePage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [category, setCategory] = useState<IssueCategory | ''>('')
  const [priority, setPriority] = useState<IssuePriority | ''>('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const { data: buildingsData, isLoading: buildingsLoading } = useBuildings(
    1,
    100,
  )
  const createMutation = useCreateIssue()

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
        // Only Owner/Manager can create issues
        if (session.role === 'renter') {
          window.location.href = '/dashboard'
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

    if (!buildingId) {
      newErrors.buildingId = t('issues.buildingRequired')
    }

    if (!title.trim()) {
      newErrors.title = t('issues.titleRequired')
    } else if (title.trim().length > 200) {
      newErrors.title = t('issues.titleMaxLength')
    }

    if (!description.trim()) {
      newErrors.description = t('issues.descriptionRequired')
    } else if (description.trim().length > 2000) {
      newErrors.description = t('issues.descriptionMaxLength')
    }

    if (!category) {
      newErrors.category = t('issues.categoryRequired')
    }

    if (!priority) {
      newErrors.priority = t('issues.priorityRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      await createMutation.mutateAsync({
        buildingId,
        title: title.trim(),
        description: description.trim(),
        category: category as IssueCategory,
        priority: priority as IssuePriority,
      })
      setSuccessMessage(t('issues.createSuccess'))
      // Redirect after short delay
      setTimeout(() => {
        window.location.href = '/issues'
      }, 1000)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : t('issues.createError'),
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
    <DashboardLayout role={role} activePath="/issues">
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
          href="/issues"
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
          maxWidth: '40rem',
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
          {t('issues.createIssue')}
        </h1>

        {errors.form && (
          <p
            style={{
              fontSize: '0.875rem',
              color: '#dc2626',
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: '#fef2f2',
              borderRadius: '0.375rem',
            }}
          >
            {errors.form}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {/* Building Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <FormField
              label={t('issues.building')}
              required
              error={errors.buildingId}
              htmlFor="issue-building"
            >
              <select
                id="issue-building"
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${errors.buildingId ? '#dc2626' : '#d1d5db'}`,
                  minHeight: '44px',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="">{t('issues.selectBuilding')}</option>
                {buildingsLoading ? (
                  <option disabled>{t('common.loading')}</option>
                ) : (
                  (buildingsData?.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </FormField>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '1.25rem' }}>
            <FormField
              label={t('issues.issueTitle')}
              required
              error={errors.title}
              htmlFor="issue-title"
            >
              <FormInput
                id="issue-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                hasError={!!errors.title}
                maxLength={200}
                placeholder={t('issues.titlePlaceholder')}
              />
            </FormField>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <FormField
              label={t('issues.description')}
              required
              error={errors.description}
              htmlFor="issue-description"
            >
              <textarea
                id="issue-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder={t('issues.descriptionPlaceholder')}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${errors.description ? '#dc2626' : '#d1d5db'}`,
                  minHeight: '120px',
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
              {description.length}/2000
            </p>
          </div>

          {/* Category */}
          <div style={{ marginBottom: '1.25rem' }}>
            <FormField
              label={t('issues.category')}
              required
              error={errors.category}
              htmlFor="issue-category"
            >
              <select
                id="issue-category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as IssueCategory | '')
                }
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${errors.category ? '#dc2626' : '#d1d5db'}`,
                  minHeight: '44px',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="">{t('issues.selectCategory')}</option>
                <option value="plumbing">{t('issues.plumbing')}</option>
                <option value="electrical">{t('issues.electrical')}</option>
                <option value="structural">{t('issues.structural')}</option>
                <option value="cleaning">{t('issues.cleaning')}</option>
                <option value="security">{t('issues.security')}</option>
                <option value="other">{t('issues.other')}</option>
              </select>
            </FormField>
          </div>

          {/* Priority */}
          <div style={{ marginBottom: '1.5rem' }}>
            <FormField
              label={t('issues.priority')}
              required
              error={errors.priority}
              htmlFor="issue-priority"
            >
              <select
                id="issue-priority"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as IssuePriority | '')
                }
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${errors.priority ? '#dc2626' : '#d1d5db'}`,
                  minHeight: '44px',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="">{t('issues.selectPriority')}</option>
                <option value="low">{t('issues.low')}</option>
                <option value="medium">{t('issues.medium')}</option>
                <option value="high">{t('issues.high')}</option>
                <option value="urgent">{t('issues.urgent')}</option>
              </select>
            </FormField>
          </div>

          {/* Submit */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
            }}
          >
            <a
              href="/issues"
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
                : t('issues.createIssue')}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
