'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { useBuildings } from '@/hooks/use-buildings'
import { useCreateNotice } from '@/hooks/use-notices'
import type { NoticeTargetAudience } from '@/lib/api-client'
import { fetchFlats } from '@/lib/api-client'
import { useTranslation } from '@/lib/i18n'

/**
 * New notice form — /notices/new
 * Accessible by Owner and Manager roles.
 * Title (max 200 chars), body (max 5000 chars), target audience, building/flat selection.
 */
export default function NewNoticePage() {
  const { t } = useTranslation()
  const router = useRouter()
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
        router.push('/notices')
      }, 1500)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : t('notices.createError'),
      })
    }
  }
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

      <div className="mb-6">
        <Link
          href="/notices"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>

      <Card className="max-w-[640px]">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold text-ink-strong mb-6">
            {t('notices.createNotice')}
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
              <p className="text-xs text-steel mt-1">{title.length}/200</p>
            </div>

            {/* Body */}
            <div className="mb-5">
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
                  className={[
                    'w-full px-3 py-2 text-sm rounded-md border min-h-[44px] resize-y font-[inherit]',
                    errors.body
                      ? 'border-error-text bg-error-bg'
                      : 'border-hairline bg-canvas',
                  ].join(' ')}
                />
              </FormField>
              <p className="text-xs text-steel mt-1">{body.length}/5000</p>
            </div>

            {/* Target Audience */}
            <div className="mb-5">
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
                    setTargetAudience(
                      e.target.value as NoticeTargetAudience | '',
                    )
                    setTargetBuildingId('')
                    setTargetFlatId('')
                    setFlatOptions([])
                  }}
                  className={[
                    'w-full px-3 py-2 text-sm rounded-md border min-h-[44px] bg-canvas',
                    errors.targetAudience
                      ? 'border-error-text'
                      : 'border-hairline',
                  ].join(' ')}
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
              <div className="mb-5">
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
                    className={[
                      'w-full px-3 py-2 text-sm rounded-md border min-h-[44px] bg-canvas',
                      errors.targetBuildingId
                        ? 'border-error-text'
                        : 'border-hairline',
                    ].join(' ')}
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
              <div className="mb-5">
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
                    className={[
                      'w-full px-3 py-2 text-sm rounded-md border min-h-[44px] bg-canvas',
                      errors.targetFlatId
                        ? 'border-error-text'
                        : 'border-hairline',
                    ].join(' ')}
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
            <div className="flex gap-3 justify-end">
              <Button
                asChild
                variant="outline"
                className="min-h-[44px] rounded-full"
              >
                <Link href="/notices">{t('common.cancel')}</Link>
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="min-h-[44px] rounded-full bg-primary text-on-primary font-semibold"
              >
                {createMutation.isPending
                  ? t('common.loading')
                  : t('common.submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
