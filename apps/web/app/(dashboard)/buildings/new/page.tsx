'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useCreateBuilding } from '@/hooks/use-buildings'
import { useTranslation } from '@/lib/i18n'
import { useSession } from '@/contexts/session-context'

/**
 * Building creation page — /buildings/new
 * Form with name and address validation.
 * Only accessible by Owner role.
 * Validates: Requirements 5.1, 5.2
 */
export default function NewBuildingPage() {
  const { t } = useTranslation()
  const router = useRouter()
const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [totalFloors, setTotalFloors] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const createMutation = useCreateBuilding()
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
        router.push('/buildings')
      }, 1000)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : t('buildings.saveError'),
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
      {errors.form && (
        <ErrorFeedback
          message={errors.form}
          type="error"
          visible
          onDismiss={() => setErrors((prev) => ({ ...prev, form: '' }))}
        />
      )}

      <div className="mb-6">
        <Link
          href="/buildings"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-ink mb-6">
        {t('buildings.createBuilding')}
      </h1>

      <Card className="max-w-lg bg-canvas border-hairline">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
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

            <div className="flex gap-3 mt-6">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-full min-h-[44px] bg-primary text-on-primary font-semibold"
              >
                {createMutation.isPending
                  ? t('common.loading')
                  : t('common.create')}
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-full min-h-[44px] text-charcoal border-hairline"
              >
                <Link href="/buildings">{t('common.cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
