'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FormField, FormInput } from '@/components/ui/form-field'
import { useBuildings } from '@/hooks/use-buildings'
import { useCreateStaff, useStaffRoles } from '@/hooks/use-staff'
import { useTranslation } from '@/lib/i18n'

export default function NewStaffPage() {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('manager')
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successResult, setSuccessResult] = useState<{
    email: string
    password: string
    phone?: string | null
  } | null>(null)

  const { data: buildingsData } = useBuildings(1, 100)
  const { data: staffRoles } = useStaffRoles()
  const createMutation = useCreateStaff()

  const buildings = buildingsData?.data ?? []

  const roleOptions = staffRoles
    ? staffRoles.map((r) => ({
        value: r.slug,
        labelBn: r.name,
        labelEn: r.name,
      }))
    : [
        { value: 'manager', labelBn: 'ম্যানেজার', labelEn: 'Manager' },
        {
          value: 'security_guard',
          labelBn: 'সিকিউরিটি গার্ড',
          labelEn: 'Security Guard',
        },
        {
          value: 'care_taker',
          labelBn: 'কেয়ার টেকার',
          labelEn: 'Care Taker',
        },
      ]

  function toggleBuilding(buildingId: string) {
    setSelectedBuildingIds((prev) =>
      prev.includes(buildingId)
        ? prev.filter((id) => id !== buildingId)
        : [...prev, buildingId],
    )
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = t('validation.required')
    } else if (name.trim().length > 200) {
      newErrors.name = 'Name must be at most 200 characters'
    }

    if (!email.trim()) {
      newErrors.email = t('validation.required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = t('validation.invalidEmail')
    }

    if (!password) {
      newErrors.password = t('validation.required')
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    } else if (password.length > 128) {
      newErrors.password = 'Password must be at most 128 characters'
    }

    if (!role) {
      newErrors.role = t('validation.required')
    }

    if (phone.trim() && !/^01\d{9}$/.test(phone.trim())) {
      newErrors.phone =
        t('validation.invalidPhone') ||
        'Phone number must be 11 digits starting with 01'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      const result = await createMutation.mutateAsync({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        password,
        role,
        buildingIds: selectedBuildingIds,
      })
      setSuccessResult({
        email: result.email,
        password: result.temporaryPassword,
        phone: result.phone,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not create staff member'
      // Parse server field validation errors like "body/phone ..."
      const fieldMatch = message.match(/^body\/(\w+)\s+(.+)/)
      if (fieldMatch) {
        const field = fieldMatch[1] as string
        setErrors({ [field]: fieldMatch[2] ?? message, form: '' })
      } else {
        setErrors({ form: message })
      }
    }
  }

  if (successResult) {
    return (
      <>
        <div className="mb-6">
          <Link
            href="/staff"
            className="text-sm text-steel no-underline hover:underline"
          >
            ← {t('common.back')}
          </Link>
        </div>

        <Card className="max-w-lg mx-auto bg-canvas border-hairline">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-ink mb-2">
              {t('staff.createSuccess') || 'Staff Member Created'}
            </h2>
            <p className="text-steel mb-6">
              {t('staff.staffCreatedMessage') ||
                `Staff member created. They can log in with the password you set.`}
            </p>

            <div className="bg-surface rounded-md p-4 mb-6 text-left space-y-2">
              <div>
                <span className="text-sm text-steel">{t('auth.email')}: </span>
                <span className="font-medium text-ink">
                  {successResult.email}
                </span>
              </div>
              {successResult.phone && (
                <div>
                  <span className="text-sm text-steel">
                    {t('common.phone') || 'Phone'}:{' '}
                  </span>
                  <span className="font-medium text-ink">
                    {successResult.phone}
                  </span>
                </div>
              )}
              <div>
                <span className="text-sm text-steel">
                  {t('common.password') || 'Password'}:{' '}
                </span>
                <span className="font-mono font-bold text-brand-blue-deep text-lg">
                  {successResult.password}
                </span>
              </div>
            </div>

            <Button
              onClick={() => router.push('/staff')}
              className="rounded-full min-h-11 bg-primary text-on-primary font-semibold cursor-pointer"
            >
              {t('common.back') || 'Back to Staff'}
            </Button>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
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
          href="/staff"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-ink mb-6">
        {t('staff.createStaff') || 'Add Staff Member'}
      </h1>

      <Card className="max-w-2xl bg-canvas border-hairline">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            <FormField
              label={t('common.name') || 'Name'}
              required
              error={errors.name}
              htmlFor="staff-name"
            >
              <FormInput
                id="staff-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                hasError={!!errors.name}
                maxLength={200}
                autoFocus
              />
            </FormField>

            <FormField
              label={t('auth.email')}
              required
              error={errors.email}
              htmlFor="staff-email"
            >
              <FormInput
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                hasError={!!errors.email}
                maxLength={254}
              />
            </FormField>

            <FormField
              label={t('common.password') || 'Password'}
              required
              error={errors.password}
              htmlFor="staff-password"
            >
              <FormInput
                id="staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hasError={!!errors.password}
                minLength={6}
                maxLength={128}
              />
            </FormField>

            <FormField
              label={t('common.phone') || 'Phone'}
              error={errors.phone}
              htmlFor="staff-phone"
            >
              <FormInput
                id="staff-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                hasError={!!errors.phone}
                maxLength={20}
                placeholder="01XXXXXXXXX"
              />
            </FormField>

            <FormField
              label={t('common.role') || 'Role'}
              required
              error={errors.role}
              htmlFor="staff-role"
            >
              <select
                id="staff-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-hairline min-h-11 px-3 bg-white text-ink text-sm"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {locale === 'bn' ? opt.labelBn : opt.labelEn}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('nav.buildings')} htmlFor="staff-buildings">
              <div
                id="staff-buildings"
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-hairline rounded-md p-3"
              >
                {buildings.length === 0 && (
                  <p className="text-sm text-steel col-span-full">
                    {t('buildings.noBuildings')}
                  </p>
                )}
                {buildings.map((building) => (
                  <label
                    key={building.id}
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm transition-colors ${
                      selectedBuildingIds.includes(building.id)
                        ? 'border-brand-blue-deep bg-brand-blue-200/10'
                        : 'border-hairline hover:bg-surface'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBuildingIds.includes(building.id)}
                      onChange={() => toggleBuilding(building.id)}
                      className="rounded border-hairline text-brand-blue-deep focus:ring-brand/50"
                    />
                    {building.name}
                  </label>
                ))}
              </div>
            </FormField>

            <div className="flex gap-3 mt-8 border-t border-hairline pt-6">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-full min-h-11 bg-primary text-on-primary font-semibold cursor-pointer"
              >
                {createMutation.isPending
                  ? t('common.loading')
                  : t('staff.createStaff') || 'Add Staff'}
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-full min-h-11 text-charcoal border-hairline cursor-pointer"
              >
                <Link href="/staff">{t('common.cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
