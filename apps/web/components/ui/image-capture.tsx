'use client'

import { AlertCircle, Camera, RefreshCw, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ImageCaptureProps {
  value?: string
  onChange: (base64: string) => void
  onFocus?: () => void
  facingMode?: 'user' | 'environment'
  isCircular?: boolean
  previewAlt?: string
  cameraButtonLabel?: string
  uploadButtonLabel?: string
  retakeButtonLabel?: string
}

/**
 * Generalized image capture component — live webcam stream with fallback to file upload.
 */
export function ImageCapture({
  value,
  onChange,
  onFocus,
  facingMode = 'user',
  isCircular = false,
  previewAlt = 'ছবি প্রিভিউ',
  cameraButtonLabel = 'ক্যামেরা দিয়ে ছবি তুলুন',
  uploadButtonLabel = 'ছবি আপলোড করুন',
  retakeButtonLabel = 'আবার তুলুন / আপলোড করুন',
}: ImageCaptureProps) {
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
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-hairline bg-white p-4 text-center hover:border-brand-blue-deep hover:text-brand-blue-deep transition-colors active:bg-surface min-h-25"
            >
              <Camera className="h-6 w-6 text-steel" />
              <span className="text-base font-medium">{cameraButtonLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-hairline bg-white p-4 text-center hover:border-brand-blue-deep hover:text-brand-blue-deep transition-colors active:bg-surface min-h-25"
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
