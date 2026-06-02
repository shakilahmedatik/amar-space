'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { useBuildings, useCreateFlat } from '@/hooks/use-flats'
import { useTranslation } from '@/lib/i18n'

/**
 * Flat creation form page — /flats/new
 * Allows Owner to create a new flat with flat number, floor, and building reference.
 */
export default function CreateFlatPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [flatNumber, setFlatNumber] = useState('')
  const [floor, setFloor] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const { data: buildingsData, isLoading: buildingsLoading } = useBuildings()
  const createFlatMutation = useCreateFlat()
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
          router.push('/flats')
        }, 1500)
      } catch (err) {
        setErrors({
          form: err instanceof Error ? err.message : t('common.error'),
        })
      }
    },
    [
      validate,
      flatNumber,
      floor,
      buildingId,
      createFlatMutation,
      t,
      router.push,
    ],
  )

  const _ownerRole = 'owner' as const

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
      {errors.form && (
        <ErrorFeedback
          message={errors.form}
          type="error"
          visible
          onDismiss={() => setErrors((prev) => ({ ...prev, form: '' }))}
        />
      )}

      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link
            href="/flats"
            className="inline-flex items-center min-h-[44px] text-sm text-brand-blue-deep no-underline"
          >
            ← {t('common.back')}
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-ink mb-6">
          {t('flats.createFlat')}
        </h1>

        <Card className="bg-canvas rounded-xl border border-hairline">
          <CardContent className="p-6">
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
                  className={[
                    'block w-full px-3 py-2.5 text-base leading-normal rounded-md border min-h-[44px] bg-background text-foreground',
                    errors.buildingId
                      ? 'border-error-text bg-error-bg'
                      : 'border-hairline',
                  ].join(' ')}
                >
                  <option value="">{t('flats.allBuildings')}</option>
                  {(buildingsData?.data || []).map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="flex gap-3 mt-6">
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full min-h-[44px]"
                >
                  <Link href="/flats">{t('common.cancel')}</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={createFlatMutation.isPending}
                  className="rounded-full min-h-[44px]"
                >
                  {createFlatMutation.isPending
                    ? t('common.loading')
                    : t('common.create')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
