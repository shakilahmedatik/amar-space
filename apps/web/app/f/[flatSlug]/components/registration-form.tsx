'use client'

import type { RegistrationFormInput } from '@repo/shared'
import { validateRegistrationForm } from '@repo/shared'
import { useMutation } from '@tanstack/react-query'
import {
  AlertCircle,
  Calendar,
  CreditCard,
  FileText,
  Heart,
  Loader2,
  Phone,
  Upload,
  User,
  Users,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { BASE_URL } from '@/lib/api'
import { trackEvent } from '../lib/analytics'

interface RegistrationFormProps {
  flatSlug: string
  flatStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
  hasPendingRegistration: boolean
}

interface RegistrationResponse {
  success: boolean
  message: string
  requestId?: string
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const

const MAX_NID_PHOTO_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_NID_FORMATS = ['image/jpeg', 'image/png']

/**
 * Registration form component — multi-field renter registration form.
 *
 * Features:
 * - All form fields with shared Zod validation schema
 * - Field-level Bangla error messages
 * - Shows form only when flat status is AVAILABLE
 * - Hides during MAINTENANCE with maintenance message
 * - Preserves form data on validation errors
 * - Tracks "Registration Started" and "Registration Submitted" analytics events
 * - Submits via TanStack Query mutation to POST /api/portal/flat/:slug/register
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 */
export function RegistrationForm({
  flatSlug,
  flatStatus,
  hasPendingRegistration,
}: RegistrationFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    nidNumber: '',
    bloodGroup: '',
    occupation: '',
    familyMembers: '',
    emergencyContact: '',
    rentalStartDate: '',
    advanceAmount: '',
  })
  const [digitalSignature, setDigitalSignature] = useState('')
  const [nidPhoto, setNidPhoto] = useState<string | undefined>(undefined)
  const [nidPhotoName, setNidPhotoName] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [nidPhotoError, setNidPhotoError] = useState('')
  const [hasStartedTracking, setHasStartedTracking] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const nidFileInputRef = useRef<HTMLInputElement>(null)

  // TanStack Query mutation for form submission
  const mutation = useMutation({
    mutationFn: async (data: RegistrationFormInput & { nidPhoto?: string }) => {
      const response = await fetch(
        `${BASE_URL}/api/portal/flat/${flatSlug}/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: 'সার্ভারে সমস্যা হয়েছে',
        }))
        throw new Error(error.message || 'সার্ভারে সমস্যা হয়েছে')
      }

      return response.json() as Promise<RegistrationResponse>
    },
    onSuccess: () => {
      trackEvent('Registration Submitted', flatSlug)
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

  // Handle NID photo upload
  function handleNidPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setNidPhotoError('')

    if (!file) {
      setNidPhoto(undefined)
      setNidPhotoName('')
      return
    }

    if (!ACCEPTED_NID_FORMATS.includes(file.type)) {
      setNidPhotoError('শুধুমাত্র JPEG বা PNG ফরম্যাট গ্রহণযোগ্য')
      setNidPhoto(undefined)
      setNidPhotoName('')
      return
    }

    if (file.size > MAX_NID_PHOTO_SIZE) {
      setNidPhotoError('ফাইলের আকার সর্বোচ্চ ৫ MB হতে হবে')
      setNidPhoto(undefined)
      setNidPhotoName('')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setNidPhoto(reader.result as string)
      setNidPhotoName(file.name)
    }
    reader.readAsDataURL(file)
  }

  // Handle signature change from SignaturePad
  function handleSignatureChange(signatureData: string) {
    setDigitalSignature(signatureData)
    if (fieldErrors.digitalSignature) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.digitalSignature
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
      bloodGroup: formData.bloodGroup,
      occupation: formData.occupation,
      familyMembers: formData.familyMembers
        ? Number.parseInt(formData.familyMembers, 10)
        : undefined,
      emergencyContact: formData.emergencyContact,
      rentalStartDate: formData.rentalStartDate,
      advanceAmount: formData.advanceAmount
        ? Number.parseFloat(formData.advanceAmount)
        : undefined,
      digitalSignature,
    }

    const result = validateRegistrationForm(input)

    if (!result.success) {
      setFieldErrors(result.errors || {})
      return
    }

    // Submit the form
    mutation.mutate({
      ...result.data!,
      nidPhoto,
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
          এই ফ্ল্যাটটি বর্তমানে রক্ষণাবেক্ষণে আছে। নিবন্ধন সাময়িকভাবে বন্ধ।
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
          এই ফ্ল্যাটের জন্য একটি নিবন্ধন অনুরোধ ইতিমধ্যে অপেক্ষমাণ আছে।
        </p>
      </section>
    )
  }

  // Success state
  if (submitSuccess) {
    return (
      <section
        aria-label="নিবন্ধন সফল"
        className="flex flex-col items-center gap-3 rounded-lg border border-hairline bg-success-bg p-6 text-center"
      >
        <FileText className="h-10 w-10 text-success-text" aria-hidden />
        <h2 className="text-lg font-bold text-success-text">
          নিবন্ধন সফল হয়েছে!
        </h2>
        <p className="text-base text-ink">
          আপনার নিবন্ধন অনুরোধ সফলভাবে জমা হয়েছে। বিল্ডিং ম্যানেজার শীঘ্রই আপনার অনুরোধ
          পর্যালোচনা করবেন।
        </p>
      </section>
    )
  }

  return (
    <section aria-label="ভাড়াটিয়া নিবন্ধন">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
        <FileText className="h-5 w-5" aria-hidden />
        ভাড়াটিয়া নিবন্ধন
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {/* Full Name */}
        <FormField
          label="পূর্ণ নাম"
          icon={<User className="h-4 w-4" aria-hidden />}
          error={fieldErrors.fullName}
          fieldId="reg-fullName"
        >
          <input
            id="reg-fullName"
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            onFocus={handleFieldFocus}
            placeholder="আপনার পূর্ণ নাম লিখুন"
            maxLength={100}
            className="w-full rounded-lg border border-hairline bg-white px-3 py-3 text-base text-ink placeholder:text-steel focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep"
            aria-invalid={!!fieldErrors.fullName}
            aria-describedby={
              fieldErrors.fullName ? 'fullName-error' : undefined
            }
          />
        </FormField>

        {/* Phone */}
        <FormField
          label="ফোন নম্বর"
          icon={<Phone className="h-4 w-4" aria-hidden />}
          error={fieldErrors.phone}
          fieldId="reg-phone"
        >
          <input
            id="reg-phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            onFocus={handleFieldFocus}
            placeholder="01XXXXXXXXX"
            maxLength={11}
            className="w-full rounded-lg border border-hairline bg-white px-3 py-3 text-base text-ink placeholder:text-steel focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep"
            aria-invalid={!!fieldErrors.phone}
            aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
          />
        </FormField>

        {/* NID Number */}
        <FormField
          label="জাতীয় পরিচয়পত্র নম্বর"
          icon={<CreditCard className="h-4 w-4" aria-hidden />}
          error={fieldErrors.nidNumber}
          fieldId="reg-nidNumber"
        >
          <input
            id="reg-nidNumber"
            type="text"
            name="nidNumber"
            value={formData.nidNumber}
            onChange={handleInputChange}
            onFocus={handleFieldFocus}
            placeholder="১০ বা ১৭ সংখ্যার NID নম্বর"
            maxLength={17}
            inputMode="numeric"
            className="w-full rounded-lg border border-hairline bg-white px-3 py-3 text-base text-ink placeholder:text-steel focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep"
            aria-invalid={!!fieldErrors.nidNumber}
            aria-describedby={
              fieldErrors.nidNumber ? 'nidNumber-error' : undefined
            }
          />
        </FormField>

        {/* Blood Group */}
        <FormField
          label="রক্তের গ্রুপ"
          icon={<Heart className="h-4 w-4" aria-hidden />}
          error={fieldErrors.bloodGroup}
          fieldId="reg-bloodGroup"
        >
          <select
            id="reg-bloodGroup"
            name="bloodGroup"
            value={formData.bloodGroup}
            onChange={handleInputChange}
            onFocus={handleFieldFocus}
            className="w-full rounded-lg border border-hairline bg-white px-3 py-3 text-base text-ink focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep"
            aria-invalid={!!fieldErrors.bloodGroup}
            aria-describedby={
              fieldErrors.bloodGroup ? 'bloodGroup-error' : undefined
            }
          >
            <option value="">রক্তের গ্রুপ নির্বাচন করুন</option>
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </FormField>

        {/* Occupation */}
        <FormField
          label="পেশা"
          icon={<User className="h-4 w-4" aria-hidden />}
          error={fieldErrors.occupation}
          fieldId="reg-occupation"
        >
          <input
            id="reg-occupation"
            type="text"
            name="occupation"
            value={formData.occupation}
            onChange={handleInputChange}
            onFocus={handleFieldFocus}
            placeholder="আপনার পেশা লিখুন"
            maxLength={100}
            className="w-full rounded-lg border border-hairline bg-white px-3 py-3 text-base text-ink placeholder:text-steel focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep"
            aria-invalid={!!fieldErrors.occupation}
            aria-describedby={
              fieldErrors.occupation ? 'occupation-error' : undefined
            }
          />
        </FormField>

        {/* Family Members */}
        <FormField
          label="পরিবারের সদস্য সংখ্যা"
          icon={<Users className="h-4 w-4" aria-hidden />}
          error={fieldErrors.familyMembers}
          fieldId="reg-familyMembers"
        >
          <input
            id="reg-familyMembers"
            type="number"
            name="familyMembers"
            value={formData.familyMembers}
            onChange={handleInputChange}
            onFocus={handleFieldFocus}
            placeholder="১ থেকে ২০"
            min={1}
            max={20}
            inputMode="numeric"
            className="w-full rounded-lg border border-hairline bg-white px-3 py-3 text-base text-ink placeholder:text-steel focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep"
            aria-invalid={!!fieldErrors.familyMembers}
            aria-describedby={
              fieldErrors.familyMembers ? 'familyMembers-error' : undefined
            }
          />
        </FormField>

        {/* Emergency Contact */}
        <FormField
          label="জরুরি যোগাযোগ নম্বর"
          icon={<Phone className="h-4 w-4" aria-hidden />}
          error={fieldErrors.emergencyContact}
          fieldId="reg-emergencyContact"
        >
          <input
            id="reg-emergencyContact"
            type="tel"
            name="emergencyContact"
            value={formData.emergencyContact}
            onChange={handleInputChange}
            onFocus={handleFieldFocus}
            placeholder="01XXXXXXXXX"
            maxLength={11}
            className="w-full rounded-lg border border-hairline bg-white px-3 py-3 text-base text-ink placeholder:text-steel focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep"
            aria-invalid={!!fieldErrors.emergencyContact}
            aria-describedby={
              fieldErrors.emergencyContact
                ? 'emergencyContact-error'
                : undefined
            }
          />
        </FormField>

        {/* Rental Start Date */}
        <FormField
          label="ভাড়া শুরুর তারিখ"
          icon={<Calendar className="h-4 w-4" aria-hidden />}
          error={fieldErrors.rentalStartDate}
          fieldId="reg-rentalStartDate"
        >
          <input
            id="reg-rentalStartDate"
            type="date"
            name="rentalStartDate"
            value={formData.rentalStartDate}
            onChange={handleInputChange}
            onFocus={handleFieldFocus}
            min={new Date().toISOString().split('T')[0]}
            max={(() => {
              const maxDate = new Date()
              maxDate.setDate(maxDate.getDate() + 90)
              return maxDate.toISOString().split('T')[0]
            })()}
            className="w-full rounded-lg border border-hairline bg-white px-3 py-3 text-base text-ink focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep"
            aria-invalid={!!fieldErrors.rentalStartDate}
            aria-describedby={
              fieldErrors.rentalStartDate ? 'rentalStartDate-error' : undefined
            }
          />
        </FormField>

        {/* Advance Amount */}
        <FormField
          label="অগ্রিম পরিমাণ (টাকা)"
          icon={<CreditCard className="h-4 w-4" aria-hidden />}
          error={fieldErrors.advanceAmount}
          fieldId="reg-advanceAmount"
        >
          <input
            id="reg-advanceAmount"
            type="number"
            name="advanceAmount"
            value={formData.advanceAmount}
            onChange={handleInputChange}
            onFocus={handleFieldFocus}
            placeholder="০ থেকে ৯,৯৯,৯৯,৯৯৯"
            min={0}
            max={99999999}
            inputMode="numeric"
            className="w-full rounded-lg border border-hairline bg-white px-3 py-3 text-base text-ink placeholder:text-steel focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep"
            aria-invalid={!!fieldErrors.advanceAmount}
            aria-describedby={
              fieldErrors.advanceAmount ? 'advanceAmount-error' : undefined
            }
          />
        </FormField>

        {/* Digital Signature */}
        <FormField
          label="ডিজিটাল স্বাক্ষর"
          icon={<FileText className="h-4 w-4" aria-hidden />}
          error={fieldErrors.digitalSignature}
          fieldId="reg-digitalSignature"
        >
          <SignaturePadPlaceholder
            value={digitalSignature}
            onChange={handleSignatureChange}
            onFocus={handleFieldFocus}
          />
        </FormField>

        {/* NID Photo (Optional) */}
        <FormField
          label="NID ছবি (ঐচ্ছিক)"
          icon={<Upload className="h-4 w-4" aria-hidden />}
          error={nidPhotoError}
          fieldId="reg-nidPhoto"
        >
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => nidFileInputRef.current?.click()}
              onFocus={handleFieldFocus}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-dashed border-hairline bg-white px-3 py-3 text-base text-steel transition-colors hover:border-brand-blue-deep hover:text-brand-blue-deep active:bg-surface"
            >
              <Upload className="h-5 w-5" aria-hidden />
              <span>
                {nidPhotoName || 'JPEG বা PNG ছবি আপলোড করুন (সর্বোচ্চ ৫ MB)'}
              </span>
            </button>
            <input
              id="reg-nidPhoto"
              ref={nidFileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleNidPhotoChange}
              className="hidden"
              aria-label="NID ছবি আপলোড"
            />
          </div>
        </FormField>

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
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-brand-blue-deep px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-blue-deep/90 active:bg-brand-blue-deep/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              জমা হচ্ছে...
            </>
          ) : (
            <>
              <FileText className="h-5 w-5" aria-hidden />
              নিবন্ধন জমা দিন
            </>
          )}
        </button>
      </form>
    </section>
  )
}

// ─── Helper Components ──────────────────────────────────────────────────────

interface FormFieldProps {
  label: string
  icon: React.ReactNode
  error?: string
  fieldId?: string
  children: React.ReactNode
}

/**
 * Reusable form field wrapper with label, icon, and error display.
 */
function FormField({ label, icon, error, fieldId, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className="flex items-center gap-1.5 text-base font-medium text-ink"
      >
        {icon}
        {label}
      </label>
      {children}
      {error && (
        <p
          className="flex items-center gap-1 text-base text-error-text"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

interface SignaturePadPlaceholderProps {
  value: string
  onChange: (data: string) => void
  onFocus: () => void
}

/**
 * Inline signature pad component for touch-based signature capture.
 * Uses a canvas element to capture drawn signatures and exports as base64 PNG.
 * Will be replaced by the dedicated SignaturePad component (Task 8.2).
 */
function SignaturePadPlaceholder({
  value,
  onChange,
  onFocus,
}: SignaturePadPlaceholderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(!!value)

  function getCoordinates(
    e:
      | React.TouchEvent<HTMLCanvasElement>
      | React.MouseEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) return { x: 0, y: 0 }
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function startDrawing(
    e:
      | React.TouchEvent<HTMLCanvasElement>
      | React.MouseEvent<HTMLCanvasElement>,
  ) {
    onFocus()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(
    e:
      | React.TouchEvent<HTMLCanvasElement>
      | React.MouseEvent<HTMLCanvasElement>,
  ) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function stopDrawing() {
    if (!isDrawing) return
    setIsDrawing(false)
    setHasStrokes(true)

    const canvas = canvasRef.current
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png')
      onChange(dataUrl)
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
    onChange('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-hairline bg-white">
        <canvas
          id="reg-digitalSignature"
          ref={canvasRef}
          width={300}
          height={150}
          className="w-full touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          aria-label="স্বাক্ষর প্যাড — এখানে আঙুল দিয়ে স্বাক্ষর করুন"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-base text-steel">
          {hasStrokes ? 'স্বাক্ষর সম্পন্ন' : 'এখানে আঙুল দিয়ে স্বাক্ষর করুন'}
        </p>
        {hasStrokes && (
          <button
            type="button"
            onClick={clearSignature}
            className="min-h-[48px] min-w-[48px] rounded px-2 py-1 text-base text-error-text hover:bg-error-bg active:bg-error-bg"
          >
            মুছুন
          </button>
        )}
      </div>
    </div>
  )
}
