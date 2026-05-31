'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FileUpload } from '@/components/ui/file-upload'
import { FormField, FormInput } from '@/components/ui/form-field'
import { useCreateRenter, useVacantFlats } from '@/hooks/use-renters'
import { useTranslation } from '@/lib/i18n'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

/**
 * Renter registration form — /renters/new
 * Multi-field form with all required and optional fields.
 * NID photo upload and digital signature upload.
 * Flat selection (only Vacant flats).
 * Field-level validation with Bangla error messages.
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.9, 4.11, 4.12
 */
export default function NewRenterPage() {
  const { t } = useTranslation()
  const router = useRouter()
  // Required fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [nidNumber, setNidNumber] = useState('')
  const [occupation, setOccupation] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [totalFamilyMembers, setTotalFamilyMembers] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactNumber, setEmergencyContactNumber] = useState('')
  const [emergencyContactRelationship, setEmergencyContactRelationship] =
    useState('')
  const [rentalStartDate, setRentalStartDate] = useState('')
  const [advanceAmountPaid, setAdvanceAmountPaid] = useState('')
  const [flatId, setFlatId] = useState('')
  const [monthlyRentAmount, setMonthlyRentAmount] = useState('')

  // Optional fields
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [familyMemberNames, setFamilyMemberNames] = useState<string[]>([])
  const [familyMemberInput, setFamilyMemberInput] = useState('')
  const [nidPhoto, setNidPhoto] = useState<File | null>(null)
  const [digitalSignature, setDigitalSignature] = useState<File | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const createMutation = useCreateRenter()
  const { data: vacantFlatsData, isLoading: isLoadingFlats } = useVacantFlats()
  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    // Full Name
    if (!fullName.trim()) {
      newErrors.fullName = t('renters.fullNameRequired')
    }

    // Phone - Bangladeshi format: 11 digits starting with 01
    if (!phone.trim()) {
      newErrors.phone = t('renters.phoneRequired')
    } else if (!/^01\d{9}$/.test(phone.trim())) {
      newErrors.phone = t('renters.phoneInvalid')
    }

    // NID - numeric, 10-17 digits
    if (!nidNumber.trim()) {
      newErrors.nidNumber = t('renters.nidRequired')
    } else if (!/^\d{10,17}$/.test(nidNumber.trim())) {
      newErrors.nidNumber = t('renters.nidInvalid')
    }

    // Occupation
    if (!occupation.trim()) {
      newErrors.occupation = t('renters.occupationRequired')
    }

    // Blood Group
    if (!bloodGroup) {
      newErrors.bloodGroup = t('renters.bloodGroupRequired')
    } else if (!BLOOD_GROUPS.includes(bloodGroup)) {
      newErrors.bloodGroup = t('renters.bloodGroupInvalid')
    }

    // Total Family Members - 1-50 inclusive
    if (!totalFamilyMembers.trim()) {
      newErrors.totalFamilyMembers = t('renters.familyMembersRequired')
    } else {
      const members = Number.parseInt(totalFamilyMembers, 10)
      if (Number.isNaN(members) || members < 1 || members > 50) {
        newErrors.totalFamilyMembers = t('renters.familyMembersRange')
      }
    }

    // Emergency Contact Name
    if (!emergencyContactName.trim()) {
      newErrors.emergencyContactName = t('renters.emergencyNameRequired')
    }

    // Emergency Contact Number
    if (!emergencyContactNumber.trim()) {
      newErrors.emergencyContactNumber = t('renters.emergencyNumberRequired')
    } else if (!/^01\d{9}$/.test(emergencyContactNumber.trim())) {
      newErrors.emergencyContactNumber = t('renters.emergencyNumberInvalid')
    }

    // Emergency Contact Relationship
    if (!emergencyContactRelationship.trim()) {
      newErrors.emergencyContactRelationship = t(
        'renters.emergencyRelationshipRequired',
      )
    }

    // Rental Start Date
    if (!rentalStartDate) {
      newErrors.rentalStartDate = t('renters.startDateRequired')
    }

    // Advance Amount
    if (!advanceAmountPaid.trim()) {
      newErrors.advanceAmountPaid = t('renters.advanceRequired')
    } else {
      const amount = Number.parseFloat(advanceAmountPaid)
      if (Number.isNaN(amount) || amount < 0.01) {
        newErrors.advanceAmountPaid = t('renters.advanceMin')
      }
    }

    // Flat ID
    if (!flatId) {
      newErrors.flatId = t('renters.flatRequired')
    }

    // Monthly Rent
    if (!monthlyRentAmount.trim()) {
      newErrors.monthlyRentAmount = t('renters.monthlyRentRequired')
    } else {
      const rent = Number.parseFloat(monthlyRentAmount)
      if (Number.isNaN(rent) || rent < 0.01) {
        newErrors.monthlyRentAmount = t('renters.monthlyRentMin')
      }
    }

    // Optional: Family Member Names validation
    if (familyMemberNames.length > 20) {
      newErrors.familyMemberNames = t('renters.familyMemberMax')
    } else {
      for (const name of familyMemberNames) {
        if (name.length > 100) {
          newErrors.familyMemberNames = t('renters.familyMemberNameMax')
          break
        }
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
        fullName: fullName.trim(),
        phone: phone.trim(),
        nidNumber: nidNumber.trim(),
        occupation: occupation.trim(),
        bloodGroup,
        totalFamilyMembers: Number.parseInt(totalFamilyMembers, 10),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactNumber: emergencyContactNumber.trim(),
        emergencyContactRelationship: emergencyContactRelationship.trim(),
        rentalStartDate,
        advanceAmountPaid: Number.parseFloat(advanceAmountPaid),
        flatId,
        monthlyRentAmount: Number.parseFloat(monthlyRentAmount),
        dateOfBirth: dateOfBirth || undefined,
        familyMemberNames:
          familyMemberNames.length > 0 ? familyMemberNames : undefined,
        nidPhoto: nidPhoto || undefined,
        digitalSignature: digitalSignature || undefined,
      })
      setSuccessMessage(t('renters.createSuccess'))
      setTimeout(() => {
        router.push('/renters')
      }, 1000)
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : t('renters.saveError'),
      })
    }
  }

  const handleAddFamilyMember = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const name = familyMemberInput.trim()
        if (name && familyMemberNames.length < 20 && name.length <= 100) {
          setFamilyMemberNames([...familyMemberNames, name])
          setFamilyMemberInput('')
        }
      }
    },
    [familyMemberInput, familyMemberNames],
  )

  const handleRemoveFamilyMember = useCallback(
    (index: number) => {
      setFamilyMemberNames(familyMemberNames.filter((_, i) => i !== index))
    },
    [familyMemberNames],
  )

  const handleNidPhotoSelected = useCallback((files: File[]) => {
    setNidPhoto(files[0] || null)
  }, [])

  const handleSignatureSelected = useCallback((files: File[]) => {
    setDigitalSignature(files[0] || null)
  }, [])
  const vacantFlats = vacantFlatsData?.data ?? []

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
          href="/renters"
          className="text-sm text-steel no-underline hover:underline"
        >
          ← {t('common.back')}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-ink mb-6">
        {t('renters.registerRenter')}
      </h1>

      <Card className="bg-canvas rounded-xl border border-hairline max-w-160">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Personal Information Section */}
            <h2 className="text-lg font-semibold text-ink mb-4 pb-2 border-b border-hairline">
              {t('renters.personalInfo')}
            </h2>

            <FormField
              label={t('renters.fullName')}
              required
              error={errors.fullName}
              htmlFor="renter-fullname"
            >
              <FormInput
                id="renter-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                hasError={!!errors.fullName}
                autoFocus
              />
            </FormField>

            <FormField
              label={t('renters.phone')}
              required
              error={errors.phone}
              htmlFor="renter-phone"
              helpText="01XXXXXXXXX"
            >
              <FormInput
                id="renter-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                hasError={!!errors.phone}
                maxLength={11}
              />
            </FormField>

            <FormField
              label={t('renters.nidNumber')}
              required
              error={errors.nidNumber}
              htmlFor="renter-nid"
              helpText="10-17 digits"
            >
              <FormInput
                id="renter-nid"
                type="text"
                value={nidNumber}
                onChange={(e) => setNidNumber(e.target.value)}
                hasError={!!errors.nidNumber}
                maxLength={17}
              />
            </FormField>

            <FormField
              label={t('renters.dateOfBirth')}
              error={errors.dateOfBirth}
              htmlFor="renter-dob"
            >
              <FormInput
                id="renter-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                hasError={!!errors.dateOfBirth}
              />
            </FormField>

            <FormField
              label={t('renters.occupation')}
              required
              error={errors.occupation}
              htmlFor="renter-occupation"
            >
              <FormInput
                id="renter-occupation"
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                hasError={!!errors.occupation}
              />
            </FormField>

            <FormField
              label={t('renters.bloodGroup')}
              required
              error={errors.bloodGroup}
              htmlFor="renter-blood-group"
            >
              <select
                id="renter-blood-group"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                aria-invalid={!!errors.bloodGroup || undefined}
                className={[
                  'block w-full px-3 py-2.5 text-base leading-6 rounded-md border min-h-[44px]',
                  'bg-background text-foreground',
                  errors.bloodGroup
                    ? 'border-error-text bg-error-bg'
                    : 'border-hairline',
                ].join(' ')}
              >
                <option value="">{t('renters.selectBloodGroup')}</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label={t('renters.familyMembers')}
              required
              error={errors.totalFamilyMembers}
              htmlFor="renter-family-members"
              helpText="1-50"
            >
              <FormInput
                id="renter-family-members"
                type="number"
                value={totalFamilyMembers}
                onChange={(e) => setTotalFamilyMembers(e.target.value)}
                hasError={!!errors.totalFamilyMembers}
                min={1}
                max={50}
              />
            </FormField>

            {/* Family Member Names (Optional) */}
            <FormField
              label={t('renters.familyMemberNames')}
              error={errors.familyMemberNames}
              htmlFor="renter-family-names"
              helpText={t('renters.familyMemberPlaceholder')}
            >
              <FormInput
                id="renter-family-names"
                type="text"
                value={familyMemberInput}
                onChange={(e) => setFamilyMemberInput(e.target.value)}
                onKeyDown={handleAddFamilyMember}
                hasError={!!errors.familyMemberNames}
                maxLength={100}
              />
            </FormField>
            {familyMemberNames.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 -mt-2">
                {familyMemberNames.map((name, idx) => (
                  <span
                    key={`member-${name}-${idx.toString()}`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-blue-200 border border-hairline text-[0.8125rem] text-brand-blue-deep"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => handleRemoveFamilyMember(idx)}
                      aria-label={`Remove ${name}`}
                      className="inline-flex items-center justify-center min-w-xl min-h-xl border-none bg-transparent text-error-text cursor-pointer text-base font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Emergency Contact Section */}
            <h2 className="text-lg font-semibold text-ink mb-4 mt-6 pb-2 border-b border-hairline">
              {t('renters.emergencyContact')}
            </h2>

            <FormField
              label={t('renters.emergencyContactName')}
              required
              error={errors.emergencyContactName}
              htmlFor="renter-emergency-name"
            >
              <FormInput
                id="renter-emergency-name"
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                hasError={!!errors.emergencyContactName}
              />
            </FormField>

            <FormField
              label={t('renters.emergencyContactNumber')}
              required
              error={errors.emergencyContactNumber}
              htmlFor="renter-emergency-number"
              helpText="01XXXXXXXXX"
            >
              <FormInput
                id="renter-emergency-number"
                type="tel"
                value={emergencyContactNumber}
                onChange={(e) => setEmergencyContactNumber(e.target.value)}
                hasError={!!errors.emergencyContactNumber}
                maxLength={11}
              />
            </FormField>

            <FormField
              label={t('renters.emergencyContactRelationship')}
              required
              error={errors.emergencyContactRelationship}
              htmlFor="renter-emergency-relationship"
            >
              <FormInput
                id="renter-emergency-relationship"
                type="text"
                value={emergencyContactRelationship}
                onChange={(e) =>
                  setEmergencyContactRelationship(e.target.value)
                }
                hasError={!!errors.emergencyContactRelationship}
              />
            </FormField>

            {/* Rental Information Section */}
            <h2 className="text-lg font-semibold text-ink mb-4 mt-6 pb-2 border-b border-hairline">
              {t('renters.contractInfo')}
            </h2>

            <FormField
              label={t('renters.selectFlat')}
              required
              error={errors.flatId}
              htmlFor="renter-flat"
            >
              <select
                id="renter-flat"
                value={flatId}
                onChange={(e) => setFlatId(e.target.value)}
                disabled={isLoadingFlats}
                aria-invalid={!!errors.flatId || undefined}
                className={[
                  'block w-full px-3 py-2.5 text-base leading-6 rounded-md border min-h-[44px]',
                  'bg-background text-foreground',
                  errors.flatId
                    ? 'border-error-text bg-error-bg'
                    : 'border-hairline',
                ].join(' ')}
              >
                <option value="">{t('renters.selectFlatPlaceholder')}</option>
                {vacantFlats.map((flat) => (
                  <option key={flat.id} value={flat.id}>
                    {flat.buildingName ?? ''} — {flat.flatNumber} (Floor{' '}
                    {flat.floor})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label={t('renters.rentalStartDate')}
              required
              error={errors.rentalStartDate}
              htmlFor="renter-start-date"
            >
              <FormInput
                id="renter-start-date"
                type="date"
                value={rentalStartDate}
                onChange={(e) => setRentalStartDate(e.target.value)}
                hasError={!!errors.rentalStartDate}
              />
            </FormField>

            <FormField
              label={t('renters.monthlyRent')}
              required
              error={errors.monthlyRentAmount}
              htmlFor="renter-monthly-rent"
              helpText="৳"
            >
              <FormInput
                id="renter-monthly-rent"
                type="number"
                value={monthlyRentAmount}
                onChange={(e) => setMonthlyRentAmount(e.target.value)}
                hasError={!!errors.monthlyRentAmount}
                min={0.01}
                step={0.01}
              />
            </FormField>

            <FormField
              label={t('renters.advanceAmount')}
              required
              error={errors.advanceAmountPaid}
              htmlFor="renter-advance"
              helpText="৳"
            >
              <FormInput
                id="renter-advance"
                type="number"
                value={advanceAmountPaid}
                onChange={(e) => setAdvanceAmountPaid(e.target.value)}
                hasError={!!errors.advanceAmountPaid}
                min={0.01}
                step={0.01}
              />
            </FormField>

            {/* File Uploads Section */}
            <h2 className="text-lg font-semibold text-ink mb-4 mt-6 pb-2 border-b border-hairline">
              {t('renters.nidPhoto')} & {t('renters.digitalSignature')}
            </h2>

            <FormField
              label={t('renters.nidPhoto')}
              htmlFor="renter-nid-photo"
              helpText="JPEG, PNG, WebP • Max 5MB"
            >
              <FileUpload
                onFilesSelected={handleNidPhotoSelected}
                maxFiles={1}
                disabled={createMutation.isPending}
              />
            </FormField>

            <FormField
              label={t('renters.digitalSignature')}
              htmlFor="renter-signature"
              helpText="JPEG, PNG, WebP • Max 5MB"
            >
              <FileUpload
                onFilesSelected={handleSignatureSelected}
                maxFiles={1}
                disabled={createMutation.isPending}
              />
            </FormField>

            {/* Submit */}
            <div className="flex gap-3 mt-6">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="min-h-[44px] rounded-full bg-primary text-on-primary font-semibold disabled:opacity-50"
              >
                {createMutation.isPending
                  ? t('common.loading')
                  : t('common.submit')}
              </Button>

              <Button
                asChild
                variant="outline"
                className="min-h-[44px] rounded-full"
              >
                <Link href="/renters">{t('common.cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
