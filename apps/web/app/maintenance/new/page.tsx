'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
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
  const router = useRouter()
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
        router.push('/maintenance')
      }, 1500)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : t('maintenance.createError'),
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

      <div className="mb-6">
        <Link
          href="/maintenance"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>

      <div className="p-6 rounded-xl border border-hairline bg-canvas max-w-[640px]">
        <h1 className="text-2xl font-bold text-ink mb-6">
          {t('maintenance.createRequest')}
        </h1>

        {errors.form && (
          <p className="text-sm text-error-text mb-4 px-3 py-3 rounded-md bg-error-bg">
            {errors.form}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="mb-5">
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
          <div className="mb-5">
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
                className={[
                  'w-full px-3 py-2 text-sm rounded-md border min-h-[44px] resize-y font-[inherit]',
                  errors.description
                    ? 'border-error-text bg-error-bg'
                    : 'border-hairline bg-canvas',
                ].join(' ')}
              />
            </FormField>
            <p className="text-xs text-steel mt-1">{description.length}/2000</p>
          </div>

          {/* Priority */}
          <div className="mb-5">
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
                className={[
                  'w-full px-3 py-2 text-sm rounded-md border min-h-[44px] bg-canvas',
                  errors.priority ? 'border-error-text' : 'border-hairline',
                ].join(' ')}
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
          <div className="mb-6">
            <label
              htmlFor="file-attachments"
              className="block text-sm font-medium text-charcoal mb-2"
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
          <div className="flex gap-3 justify-end">
            <Button
              asChild
              variant="outline"
              className="rounded-full min-h-[44px]"
            >
              <Link href="/maintenance">{t('common.cancel')}</Link>
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-full min-h-[44px] bg-primary text-on-primary font-semibold"
            >
              {createMutation.isPending
                ? t('common.loading')
                : t('common.submit')}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
