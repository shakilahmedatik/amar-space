'use client'

import type { RegistrationFormInput } from '@repo/shared'
import { validateRegistrationForm } from '@repo/shared'
import { useMutation } from '@tanstack/react-query'
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle2,
  Copy,
  CreditCard,
  FileText,
  Heart,
  Loader2,
  Phone,
  RefreshCw,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BASE_URL } from '@/lib/api'
import { cn } from '@/lib/utils'
import { trackEvent } from '../lib/analytics'
import { SignaturePad } from './signature-pad'

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

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const

/**
 * Generalized image capture component — live webcam stream with fallback to file upload.
 */
function ImageCapture({
  value,
  onChange,
  onFocus,
  facingMode = 'user',
  isCircular = false,
  previewAlt = 'ছবি প্রিভিউ',
  cameraButtonLabel = 'ক্যামেরা দিয়ে ছবি তুলুন',
  uploadButtonLabel = 'ছবি আপলোড করুন',
  retakeButtonLabel = 'আবার তুলুন / আপলোড করুন',
}: {
  value?: string
  onChange: (base64: string) => void
  onFocus?: () => void
  facingMode?: 'user' | 'environment'
  isCircular?: boolean
  previewAlt?: string
  cameraButtonLabel?: string
  uploadButtonLabel?: string
  retakeButtonLabel?: string
  placeholderLabel?: string
}) {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    onFocus?.()
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsCameraActive(true)
    } catch (err) {
      console.error(err)
      setCameraError('ক্যামেরা চালু করা যায়নি। অনুগ্রহ করে ফাইল আপলোড করুন।')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }
    setIsCameraActive(false)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const base64 = canvas.toDataURL('image/jpeg', 0.8)
      onChange(base64)
      stopCamera()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFocus?.()
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('শুধুমাত্র JPEG বা PNG ছবি গ্রহণযোগ্য')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('ফাইলের আকার সর্বোচ্চ ৫ MB হতে হবে')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onChange(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop()
        }
      }
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-hairline bg-surface p-4 flex flex-col items-center">
          {/* biome-ignore lint/performance/noImgElement: R2 base64 and dynamic image urls */}
          <img
            src={value}
            alt={previewAlt}
            className={cn(
              'object-cover border-4 border-white shadow-md bg-white',
              isCircular
                ? 'h-40 w-40 rounded-full'
                : 'w-full max-w-sm aspect-3/2 rounded-lg',
            )}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="mt-3 flex min-h-[48px] items-center gap-2 rounded-lg border border-hairline bg-white px-4 py-2 text-base font-medium text-ink transition-colors hover:bg-surface active:bg-surface-dark"
          >
            <RefreshCw className="h-4 w-4" />
            {retakeButtonLabel}
          </button>
        </div>
      ) : isCameraActive ? (
        <div className="relative overflow-hidden rounded-lg border border-hairline bg-black flex flex-col items-center p-2">
          {/* biome-ignore lint/a11y/useMediaCaption: Live camera preview needs no captions */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-w-sm rounded-lg aspect-video object-cover"
          />
          <div className="mt-3 flex gap-3 w-full max-w-sm justify-center">
            <button
              type="button"
              onClick={capturePhoto}
              className="flex-1 flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-brand-blue-deep px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-brand-blue-deep/90 active:bg-brand-blue-deep/80"
            >
              <Camera className="h-5 w-5" />
              ছবি তুলুন
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-hairline bg-white px-4 py-2 text-base font-medium text-ink transition-colors hover:bg-surface active:bg-surface-dark"
            >
              <X className="h-5 w-5" />
              বাতিল
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={startCamera}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-hairline bg-white p-4 text-center hover:border-brand-blue-deep hover:text-brand-blue-deep transition-colors active:bg-surface min-h-[100px]"
            >
              <Camera className="h-6 w-6 text-steel" />
              <span className="text-base font-medium">{cameraButtonLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-hairline bg-white p-4 text-center hover:border-brand-blue-deep hover:text-brand-blue-deep transition-colors active:bg-surface min-h-[100px]"
            >
              <Upload className="h-6 w-6 text-steel" />
              <span className="text-base font-medium">{uploadButtonLabel}</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            capture={facingMode === 'user' ? 'user' : 'environment'}
            onChange={handleFileChange}
            className="hidden"
          />
          {cameraError && (
            <p className="text-base text-warning-text bg-warning-bg p-2 rounded-lg border border-hairline flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {cameraError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Registration form component — multi-field renter registration form.
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
  const [nidPhotoError, _setNidPhotoError] = useState('')
  const [hasStartedTracking, setHasStartedTracking] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [generatedAccessCode, setGeneratedAccessCode] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)

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
  const mutation = useMutation({
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
        const error = await response.json().catch(() => ({
          message: 'সার্ভারে সমস্যা হয়েছে',
        }))
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

  // Copy access code
  function handleCopyCode() {
    if (generatedAccessCode) {
      navigator.clipboard.writeText(generatedAccessCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
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
        className="flex flex-col items-center gap-4 rounded-xl border border-hairline bg-success-bg p-6 text-center shadow-lg"
      >
        <CheckCircle2 className="h-14 w-14 text-success-text" aria-hidden />
        <h2 className="text-xl font-bold text-success-text">
          নিবন্ধন সফল হয়েছে!
        </h2>
        <p className="text-base text-ink leading-relaxed">
          আপনার নিবন্ধন অনুরোধ সফলভাবে জমা হয়েছে। বিল্ডিং ম্যানেজার শীঘ্রই আপনার অনুরোধ
          পর্যালোচনা করবেন।
        </p>

        {generatedAccessCode && (
          <div className="w-full bg-white rounded-lg p-5 border border-success-text/20 shadow-sm mt-2 flex flex-col items-center gap-3">
            <span className="text-base text-steel font-medium">
              ভবিষ্যতে লগইনের জন্য এই কোডটি সংরক্ষণ করুন
            </span>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-mono font-bold text-brand-blue-deep tracking-widest px-4 py-2 bg-surface rounded border border-hairline">
                {generatedAccessCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center justify-center p-3 rounded-lg bg-surface border border-hairline hover:bg-surface-dark transition-colors active:scale-95"
                title="কপি করুন"
              >
                {copiedCode ? (
                  <CheckCircle2 className="h-5 w-5 text-success-text" />
                ) : (
                  <Copy className="h-5 w-5 text-ink" />
                )}
              </button>
            </div>
            {copiedCode && (
              <span className="text-base text-success-text">
                কোডটি কপি করা হয়েছে!
              </span>
            )}
            <div className="mt-2 text-base text-warning-text bg-warning-bg p-3 rounded-lg border border-warning-text/20 flex gap-2 items-start text-left">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>
                <strong>গুরুত্বপূর্ণ:</strong> ম্যানেজার আপনার নিবন্ধন অনুমোদন করলে, ফ্ল্যাটের
                QR কোড স্ক্যান করে এই ৬-সংখ্যার কোডটি দিয়ে প্রবেশ করতে হবে। কোডটি অন্য
                কোথাও লিখে বা স্ক্রিনশট দিয়ে রাখুন।
              </span>
            </div>
          </div>
        )}
      </section>
    )
  }

  return (
    <section
      aria-label="ভাড়াটিয়া নিবন্ধন"
      className="bg-surface rounded-xl p-5 border border-hairline shadow-sm"
    >
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-ink border-b pb-3 border-hairline">
        <FileText className="h-5 w-5 text-brand-blue-deep" aria-hidden />
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

        {/* NID Photo - Mandatory */}
        <FormField
          label="NID ছবি (বাধ্যতামূলক)"
          icon={<Upload className="h-4 w-4" aria-hidden />}
          error={fieldErrors.nidPhoto || nidPhotoError}
          fieldId="reg-nidPhoto"
        >
          <ImageCapture
            value={nidPhoto}
            onChange={handleNidPhotoChange}
            onFocus={handleFieldFocus}
            facingMode="environment"
            isCircular={false}
            previewAlt="NID প্রিভিউ"
            cameraButtonLabel="ক্যামেরা দিয়ে NID-র ছবি তুলুন"
            uploadButtonLabel="NID ছবি আপলোড করুন"
            retakeButtonLabel="আবার তুলুন / আপলোড করুন"
            placeholderLabel="NID-এর ছবি আপলোড করুন (সর্বোচ্চ ৫ MB)"
          />
        </FormField>

        {/* Selfie Photo - Mandatory */}
        <FormField
          label="সেলফি ছবি (বাধ্যতামূলক)"
          icon={<Camera className="h-4 w-4" aria-hidden />}
          error={fieldErrors.selfiePhoto}
          fieldId="reg-selfiePhoto"
        >
          <ImageCapture
            value={selfiePhoto}
            onChange={handleSelfieChange}
            onFocus={handleFieldFocus}
            facingMode="user"
            isCircular={true}
            previewAlt="সেলফি প্রিভিউ"
            cameraButtonLabel="ক্যামেরা দিয়ে সেলফি তুলুন"
            uploadButtonLabel="সেলফি আপলোড করুন"
            retakeButtonLabel="আবার তুলুন / আপলোড করুন"
            placeholderLabel="সেলফি ছবি আপলোড করুন (সর্বোচ্চ ৫ MB)"
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

        {/* Family Members Count */}
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

        {/* Dynamic Family Member Names */}
        <div className="flex flex-col gap-3 pl-4 border-l-2 border-hairline bg-surface/50 p-3 rounded-r-lg">
          <span className="text-base font-semibold text-ink">
            পরিবারের সদস্যদের নাম:
          </span>
          {familyMemberNames.map((name, index) => {
            const errorKey = `familyMemberNames.${index}`
            return (
              <FormField
                // biome-ignore lint/suspicious/noArrayIndexKey: items can have duplicate values (e.g. empty strings)
                key={`member-name-${index}`}
                label={`সদস্য ${index + 1}`}
                icon={<User className="h-4 w-4 text-steel" />}
                error={fieldErrors[errorKey]}
                fieldId={`reg-familyMemberNames-${index}`}
              >
                <input
                  id={`reg-familyMemberNames-${index}`}
                  type="text"
                  value={name}
                  onChange={(e) =>
                    handleFamilyMemberNameChange(index, e.target.value)
                  }
                  onFocus={handleFieldFocus}
                  placeholder={`সদস্য ${index + 1}-এর নাম লিখুন`}
                  maxLength={100}
                  className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-base text-ink placeholder:text-steel focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep"
                  aria-invalid={!!fieldErrors[errorKey]}
                />
              </FormField>
            )
          })}
          {fieldErrors.familyMemberNames && (
            <p className="text-base text-error-text flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {fieldErrors.familyMemberNames}
            </p>
          )}
        </div>

        {/* Emergency Contact Name */}
        <FormField
          label="জরুরি যোগাযোগের ব্যক্তির নাম"
          icon={<User className="h-4 w-4" aria-hidden />}
          error={fieldErrors.emergencyContactName}
          fieldId="reg-emergencyContactName"
        >
          <input
            id="reg-emergencyContactName"
            type="text"
            name="emergencyContactName"
            value={formData.emergencyContactName}
            onChange={handleInputChange}
            onFocus={handleFieldFocus}
            placeholder="জরুরি যোগাযোগের ব্যক্তির নাম লিখুন"
            maxLength={200}
            className="w-full rounded-lg border border-hairline bg-white px-3 py-3 text-base text-ink placeholder:text-steel focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep"
            aria-invalid={!!fieldErrors.emergencyContactName}
          />
        </FormField>

        {/* Emergency Contact Phone */}
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

        {/* Emergency Contact Relationship */}
        <FormField
          label="সম্পর্ক"
          icon={<Users className="h-4 w-4" aria-hidden />}
          error={fieldErrors.emergencyContactRelationship}
          fieldId="reg-emergencyContactRelationship"
        >
          <input
            id="reg-emergencyContactRelationship"
            type="text"
            name="emergencyContactRelationship"
            value={formData.emergencyContactRelationship}
            onChange={handleInputChange}
            onFocus={handleFieldFocus}
            placeholder="যেমন: পিতা, ভাই, স্বামী ইত্যাদি"
            maxLength={100}
            className="w-full rounded-lg border border-hairline bg-white px-3 py-3 text-base text-ink placeholder:text-steel focus:border-brand-blue-deep focus:outline-none focus:ring-1 focus:ring-brand-blue-deep"
            aria-invalid={!!fieldErrors.emergencyContactRelationship}
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
          <div className="overflow-hidden rounded-lg border border-hairline bg-white">
            <SignaturePad
              onChange={handleSignatureChange}
              label="এখানে আঙুল দিয়ে স্বাক্ষর করুন"
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
    <div className="flex flex-col gap-1.5 w-full">
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
