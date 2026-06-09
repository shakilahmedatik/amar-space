'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface QrCodePreviewProps {
  blobUrl: string | null
  flatNumber: string
  buildingName: string
  isLoading: boolean
  error: Error | null
  retryCount: number
  maxRetries: number
  onRetry: () => void
}

/**
 * QR code preview component that displays the generated QR code image
 * with loading and error states.
 */
export function QrCodePreview({
  blobUrl,
  flatNumber,
  buildingName,
  isLoading,
  error,
  retryCount,
  maxRetries,
  onRetry,
}: QrCodePreviewProps) {
  const { t } = useTranslation()

  const isRetryDisabled = retryCount >= maxRetries

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {t('qrCode.generating')}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-sm text-error-text">{t('qrCode.connectionError')}</p>
        {isRetryDisabled ? (
          <p className="text-sm text-muted-foreground">
            {t('qrCode.tryAgainLater')}
          </p>
        ) : (
          <Button
            variant="outline"
            onClick={onRetry}
            disabled={isRetryDisabled}
            className="min-h-11 min-w-[44px] rounded-full"
          >
            {t('qrCode.retry')}
          </Button>
        )}
      </div>
    )
  }

  if (!blobUrl) {
    return null
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">{flatNumber}</p>
        <p className="text-sm text-muted-foreground">{buildingName}</p>
      </div>
      {/* biome-ignore lint: blob URLs are not compatible with Next.js Image optimization */}
      <img
        src={blobUrl}
        alt={t('qrCode.imageAlt', { flatNumber, buildingName })}
        className={cn(
          'max-w-full aspect-square object-contain',
          'min-w-[150px] min-h-[150px]',
          'sm:min-w-[200px] sm:min-h-[200px]',
        )}
      />
    </div>
  )
}
