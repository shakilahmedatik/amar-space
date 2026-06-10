'use client'

import type { RegistrationFormInput } from '@repo/shared'
import { validateRegistrationForm } from '@repo/shared'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, FileText, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { BASE_URL } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { RegistrationFields } from './registration-fields'
import { RegistrationSuccess } from './registration-success'

interface RegistrationFormProps {
  flatSlug: string
  flatStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
  hasPendingRegistration: boolean
}

interface RegistrationResponse {
  success: boolean
  message: string
  requestId?: string
  accessCode?: string
}

export function RegistrationForm({
  flatSlug,
  flatStatus,
  hasPendingRegistration,
}: RegistrationFormProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    nidNumber: '',
    bloodGroup: '',
    occupation: '',
    familyMembers: '1',
    emergencyContactName: '',
    emergencyContact: '',
    emergencyContactRelationship: '',
    rentalStartDate: '',
    advanceAmount: '',
  })
  const [familyMemberNames, setFamilyMemberNames] = useState<string[]>([''])
  const [digitalSignature, setDigitalSignature] = useState('')
  const [nidPhoto, setNidPhoto] = useState<string | undefined>(undefined)
  const [selfiePhoto, setSelfiePhoto] = useState<string | undefined>(undefined)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [hasStartedTracking, setHasStartedTracking] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [generatedAccessCode, setGeneratedAccessCode] = useState('')

  // Resizes the family member names list based on the selected count
  useEffect(() => {
    const count = Number.parseInt(formData.familyMembers, 10) || 1
    const clampedCount = Math.max(1, Math.min(20, count))
    setFamilyMemberNames((prev) => {
      const next = [...prev]
      if (next.length < clampedCount) {
        while (next.length < clampedCount) {
          next.push('')
        }
      } else if (next.length > clampedCount) {
        next.length = clampedCount
      }
      return next
    })
  }, [formData.familyMembers])

  // TanStack Query mutation for form submission
  const mutation = useMutation<
    RegistrationResponse,
    Error,
    RegistrationFormInput & { nidPhoto: string; selfiePhoto: string }
  >({
    mutationFn: async (
      data: RegistrationFormInput & { nidPhoto: string; selfiePhoto: string },
    ) => {
      const response = await fetch(
        `${BASE_URL}/api/portal/flat/${flatSlug}/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      )

      if (!response.ok) {
        const error = (await response.json().catch(() => ({
          message: 'সার্ভারে সমস্যা হয়েছে',
        }))) as { message?: string }
        throw new Error(error.message || 'সার্ভারে সমস্যা হয়েছে')
      }

      return response.json() as Promise<RegistrationResponse>
    },
    onSuccess: (data) => {
      trackEvent('Registration Submitted', flatSlug)
      if (data.accessCode) {
        setGeneratedAccessCode(data.accessCode)
      }
      setSubmitSuccess(true)
    },
  })

  // Track "Registration Started" on first interaction
  function handleFieldFocus() {
    if (!hasStartedTracking) {
      setHasStartedTracking(true)
      trackEvent('Registration Started', flatSlug)
    }
  }

  // Handle text/number input changes
  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  // Handle NID photo changes
  function handleNidPhotoChange(base64: string) {
    setNidPhoto(base64 || undefined)
    if (fieldErrors.nidPhoto) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.nidPhoto
        return next
      })
    }
  }

  // Handle selfie state changes
  function handleSelfieChange(base64: string) {
    setSelfiePhoto(base64 || undefined)
    if (fieldErrors.selfiePhoto) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.selfiePhoto
        return next
      })
    }
  }

  // Handle signature change from SignaturePad
  function handleSignatureChange(signatureData: string | null) {
    setDigitalSignature(signatureData || '')
    if (fieldErrors.digitalSignature) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.digitalSignature
        return next
      })
    }
  }

  // Handle individual family member name input
  function handleFamilyMemberNameChange(index: number, val: string) {
    setFamilyMemberNames((prev) => {
      const next = [...prev]
      next[index] = val
      return next
    })
    const errorKey = `familyMemberNames.${index}`
    if (fieldErrors[errorKey]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[errorKey]
        return next
      })
    }
  }

  // Handle form submission
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Build the validation input
    const input = {
      fullName: formData.fullName,
      phone: formData.phone,
      nidNumber: formData.nidNumber,
      nidPhoto: nidPhoto || '',
      selfiePhoto: selfiePhoto || '',
      bloodGroup: formData.bloodGroup,
      occupation: formData.occupation,
      familyMembers: formData.familyMembers
        ? Number.parseInt(formData.familyMembers, 10)
        : undefined,
      familyMemberNames,
      emergencyContactName: formData.emergencyContactName,
      emergencyContact: formData.emergencyContact,
      emergencyContactRelationship: formData.emergencyContactRelationship,
      rentalStartDate: formData.rentalStartDate,
      advanceAmount: formData.advanceAmount
        ? Number.parseFloat(formData.advanceAmount)
        : undefined,
      digitalSignature,
    }

    const result = validateRegistrationForm(input)

    if (!result.success) {
      setFieldErrors(result.errors || {})
      // Scroll to the first error element
      const firstErrorKey = Object.keys(result.errors || {})[0]
      if (firstErrorKey) {
        const element = document.getElementById(`reg-${firstErrorKey}`)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    // Submit the form
    mutation.mutate({
      ...result.data!,
      nidPhoto: nidPhoto!,
      selfiePhoto: selfiePhoto!,
    })
  }

  // MAINTENANCE state — hide form, show maintenance message
  if (flatStatus === 'MAINTENANCE') {
    return (
      <section
        aria-label="নিবন্ধন"
        className="flex flex-col items-center gap-3 rounded-lg border border-hairline bg-warning-bg p-6 text-center"
      >
        <AlertCircle className="h-10 w-10 text-warning-text" aria-hidden />
        <p className="text-base font-medium text-warning-text">
          {t('renters.maintenanceWarning') ||
            'এই ফ্ল্যাটটি বর্তমানে রক্ষণাবেক্ষণে আছে। নিবন্ধন সাময়িকভাবে বন্ধ।'}
        </p>
      </section>
    )
  }

  // OCCUPIED state — show occupied message
  if (flatStatus === 'OCCUPIED') {
    return (
      <section
        aria-label="নিবন্ধন"
        className="flex flex-col items-center gap-3 rounded-lg border border-hairline bg-surface p-6 text-center"
      >
        <AlertCircle className="h-10 w-10 text-brand-blue-deep" aria-hidden />
        <p className="text-base font-medium text-ink">
          {t('renters.occupiedWarning') ||
            'এই ফ্ল্যাটটি ইতিমধ্যে নিবন্ধিত এবং একজন ভাড়াটিয়া বসবাস করছেন। নতুন ভাড়াটিয়া নিবন্ধন সম্ভব নয়।'}
        </p>
      </section>
    )
  }

  // Only show form when flat status is AVAILABLE
  if (flatStatus !== 'AVAILABLE') {
    return null
  }

  // Duplicate pending registration check
  if (hasPendingRegistration) {
    return (
      <section
        aria-label="নিবন্ধন"
        className="flex flex-col items-center gap-3 rounded-lg border border-hairline bg-surface p-6 text-center"
      >
        <FileText className="h-10 w-10 text-brand-blue-deep" aria-hidden />
        <p className="text-base font-medium text-ink">
          {t('renters.pendingRegistrationWarning') ||
            'এই ফ্ল্যাটের জন্য একটি নিবন্ধন অনুরোধ ইতিমধ্যে অপেক্ষমাণ আছে।'}
        </p>
      </section>
    )
  }

  // Success state
  if (submitSuccess) {
    return <RegistrationSuccess generatedAccessCode={generatedAccessCode} />
  }

  return (
    <section
      aria-label="ভাড়াটিয়া নিবন্ধন"
      className="bg-surface rounded-xl p-5 border border-hairline shadow-sm"
    >
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-ink border-b pb-3 border-hairline">
        <FileText className="h-5 w-5 text-brand-blue-deep" aria-hidden />
        {t('renters.registerRenter') || 'ভাড়াটিয়া নিবন্ধন'}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <RegistrationFields
          formData={formData}
          familyMemberNames={familyMemberNames}
          fieldErrors={fieldErrors}
          nidPhoto={nidPhoto}
          selfiePhoto={selfiePhoto}
          digitalSignature={digitalSignature}
          handleInputChange={handleInputChange}
          handleFieldFocus={handleFieldFocus}
          handleNidPhotoChange={handleNidPhotoChange}
          handleSelfieChange={handleSelfieChange}
          handleSignatureChange={handleSignatureChange}
          handleFamilyMemberNameChange={handleFamilyMemberNameChange}
        />

        {/* Server error message */}
        {mutation.isError && (
          <div
            className="flex items-center gap-2 rounded-lg border border-error-text/20 bg-error-bg p-3"
            role="alert"
          >
            <AlertCircle
              className="h-5 w-5 shrink-0 text-error-text"
              aria-hidden
            />
            <p className="text-base text-error-text">
              {mutation.error.message}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-brand-blue-deep px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-blue-deep/90 active:bg-brand-blue-deep/80 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer w-full"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              {t('common.loading') || 'জমা হচ্ছে...'}
            </>
          ) : (
            <>
              <FileText className="h-5 w-5" aria-hidden />
              {t('issues.submitReport') || 'নিবন্ধন জমা দিন'}
            </>
          )}
        </button>
      </form>
    </section>
  )
}
