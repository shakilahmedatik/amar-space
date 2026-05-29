'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
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
  const router = useRouter()
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
          router.push('/login')
          return
        }
        // Only Owner/Manager can create issues
        if (session.role === 'renter') {
          router.push('/dashboard')
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
        router.push('/issues')
      }, 1000)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : t('issues.createError'),
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
    <DashboardLayout role={role} activePath="/issues">
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
          href="/issues"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>

      <div className="p-6 rounded-lg border border-hairline bg-canvas max-w-160">
        <h1 className="text-2xl font-bold text-ink mb-6">
          {t('issues.createIssue')}
        </h1>

        {errors.form && (
          <ErrorFeedback
            message={errors.form}
            type="error"
            visible
            onDismiss={() => setErrors((prev) => ({ ...prev, form: '' }))}
          />
        )}

        <form onSubmit={handleSubmit}>
          {/* Building Selection */}
          <div className="mb-5">
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
                className={`w-full px-3 py-2 text-sm rounded-md border min-h-[44px] bg-canvas text-ink ${errors.buildingId ? 'border-error-text' : 'border-hairline'}`}
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
          <div className="mb-5">
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
          <div className="mb-5">
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
                className={`w-full px-3 py-2 text-sm rounded-md border min-h-[120px] resize-y font-sans ${errors.description ? 'border-error-text' : 'border-hairline'}`}
              />
            </FormField>
            <p className="text-xs text-steel mt-1">{description.length}/2000</p>
          </div>

          {/* Category */}
          <div className="mb-5">
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
                className={`w-full px-3 py-2 text-sm rounded-md border min-h-[44px] bg-canvas text-ink ${errors.category ? 'border-error-text' : 'border-hairline'}`}
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
          <div className="mb-6">
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
                className={`w-full px-3 py-2 text-sm rounded-md border min-h-[44px] bg-canvas text-ink ${errors.priority ? 'border-error-text' : 'border-hairline'}`}
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
          <div className="flex gap-3 justify-end">
            <Button
              asChild
              variant="outline"
              className="min-h-[44px] rounded-full border-hairline text-charcoal"
            >
              <Link href="/issues">{t('common.cancel')}</Link>
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="min-h-[44px] rounded-full bg-primary text-on-primary font-semibold disabled:opacity-60"
            >
              {createMutation.isPending
                ? t('common.loading')
                : t('issues.createIssue')}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
