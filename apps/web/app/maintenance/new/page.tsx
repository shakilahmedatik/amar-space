'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FileUpload } from '@/components/ui/file-upload'
import { FormField, FormInput } from '@/components/ui/form-field'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useCreateMaintenanceRequest } from '@/hooks/use-maintenance'
import type { MaintenancePriority } from '@/lib/api-client'
import { getSession } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'

type UserRole = 'owner' | 'manager' | 'renter'

/**
 * New maintenance request form — /maintenance/new
 * Accessible by Renter role.
 * Title (5-200 chars), description (10-2000 chars), priority, file attachments.
 * Validates: Requirements 10.1, 10.2, 10.3
 */
export default function NewMaintenanceRequestPage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<MaintenancePriority | ''>('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const createMutation = useCreateMaintenanceRequest()

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

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = t('maintenance.titleRequired')
    } else if (title.trim().length < 5) {
      newErrors.title = t('maintenance.titleMinLength')
    } else if (title.trim().length > 200) {
      newErrors.title = t('maintenance.titleMaxLength')
    }

    if (!description.trim()) {
      newErrors.description = t('maintenance.descriptionRequired')
    } else if (description.trim().length < 10) {
      newErrors.description = t('maintenance.descriptionMinLength')
    } else if (description.trim().length > 2000) {
      newErrors.description = t('maintenance.descriptionMaxLength')
    }

    if (!priority) {
      newErrors.priority = t('maintenance.priorityRequired')
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
        description: description.trim(),
        priority: priority as MaintenancePriority,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
      setSuccessMessage(t('maintenance.createSuccess'))
      // Redirect after short delay
      setTimeout(() => {
        window.location.href = '/maintenance'
      }, 1500)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : t('maintenance.createError'),
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
    <DashboardLayout role={role} activePath="/maintenance">
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
          href="/maintenance"
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
          {t('maintenance.createRequest')}
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
              label={t('maintenance.requestTitle')}
              required
              error={errors.title}
              htmlFor="request-title"
            >
              <FormInput
                id="request-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                hasError={!!errors.title}
                maxLength={200}
                placeholder={t('maintenance.requestTitle')}
              />
            </FormField>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <FormField
              label={t('maintenance.description')}
              required
              error={errors.description}
              htmlFor="request-description"
            >
              <textarea
                id="request-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder={t('maintenance.description')}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${errors.description ? '#dc2626' : '#d1d5db'}`,
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
              {description.length}/2000
            </p>
          </div>

          {/* Priority */}
          <div style={{ marginBottom: '1.25rem' }}>
            <FormField
              label={t('maintenance.priority')}
              required
              error={errors.priority}
              htmlFor="request-priority"
            >
              <select
                id="request-priority"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as MaintenancePriority | '')
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
                <option value="">{t('maintenance.selectPriority')}</option>
                <option value="low">{t('maintenance.low')}</option>
                <option value="medium">{t('maintenance.medium')}</option>
                <option value="high">{t('maintenance.high')}</option>
                <option value="urgent">{t('maintenance.urgent')}</option>
              </select>
            </FormField>
          </div>

          {/* File Attachments */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="file-attachments"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.5rem',
              }}
            >
              {t('maintenance.fileAttachments')}
            </label>
            <FileUpload
              onFilesSelected={setAttachments}
              maxFiles={5}
              disabled={createMutation.isPending}
            />
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
              href="/maintenance"
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
