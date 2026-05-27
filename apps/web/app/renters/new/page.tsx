'use client'

import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout'
import { ErrorFeedback } from '@/components/ui/error-feedback'
import { FileUpload } from '@/components/ui/file-upload'
import { FormField, FormInput } from '@/components/ui/form-field'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useCreateRenter, useVacantFlats } from '@/hooks/use-renters'
import { getSession } from '@/lib/auth-client'
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
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

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

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
        if (session.role !== 'owner' && session.role !== 'manager') {
          window.location.href = '/renters'
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
        window.location.href = '/renters'
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

  if (isLoadingSession || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4">
          <LoadingSkeleton rows={5} showHeader />
        </div>
      </div>
    )
  }

  const vacantFlats = vacantFlatsData?.data ?? []

  return (
    <DashboardLayout
      role={user.role as 'owner' | 'manager'}
      activePath="/renters"
    >
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

      <div style={{ marginBottom: '1.5rem' }}>
        <a
          href="/renters"
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            textDecoration: 'none',
          }}
        >
          ← {t('common.back')}
        </a>
      </div>

      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '1.5rem',
        }}
      >
        {t('renters.registerRenter')}
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: '40rem',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Personal Information Section */}
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
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
            style={{
              display: 'block',
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '1rem',
              lineHeight: '1.5',
              borderRadius: '0.375rem',
              border: `1px solid ${errors.bloodGroup ? '#dc2626' : '#d1d5db'}`,
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              minHeight: '44px',
            }}
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
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '1rem',
              marginTop: '-0.5rem',
            }}
          >
            {familyMemberNames.map((name, idx) => (
              <span
                key={`member-${name}-${idx.toString()}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  fontSize: '0.8125rem',
                }}
              >
                {name}
                <button
                  type="button"
                  onClick={() => handleRemoveFamilyMember(idx)}
                  aria-label={`Remove ${name}`}
                  style={{
                    minWidth: '24px',
                    minHeight: '24px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Emergency Contact Section */}
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '1rem',
            marginTop: '1.5rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
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
            onChange={(e) => setEmergencyContactRelationship(e.target.value)}
            hasError={!!errors.emergencyContactRelationship}
          />
        </FormField>

        {/* Rental Information Section */}
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '1rem',
            marginTop: '1.5rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
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
            style={{
              display: 'block',
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '1rem',
              lineHeight: '1.5',
              borderRadius: '0.375rem',
              border: `1px solid ${errors.flatId ? '#dc2626' : '#d1d5db'}`,
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              minHeight: '44px',
            }}
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
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '1rem',
            marginTop: '1.5rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
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
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginTop: '1.5rem',
          }}
        >
          <button
            type="submit"
            disabled={createMutation.isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              padding: '0.625rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: '0.5rem',
              backgroundColor: createMutation.isPending ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {createMutation.isPending
              ? t('common.loading')
              : t('common.submit')}
          </button>

          <a
            href="/renters"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              padding: '0.625rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '0.5rem',
              backgroundColor: 'transparent',
              color: '#374151',
              border: '1px solid #d1d5db',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </a>
        </div>
      </form>
    </DashboardLayout>
  )
}
