'use client'

import { QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'

interface QrCodeButtonProps {
  flatNumber: string
  onClick: () => void
}

/**
 * Button that triggers QR code generation for a flat.
 * Renders a QR code icon with a localized label and accessible aria-label.
 * Minimum touch target: 44×44px for mobile accessibility.
 * Visibility is controlled by the parent (only rendered for owner/manager roles).
 * Validates: Requirements 1.1, 1.2, 1.4, 8.2, 9.4
 */
export function QrCodeButton({ flatNumber, onClick }: QrCodeButtonProps) {
  const { t } = useTranslation()

  return (
    <Button
      variant="outline"
      onClick={onClick}
      aria-label={t('qrCode.generateAriaLabel', { flatNumber })}
      className="min-h-[44px] min-w-[44px]"
    >
      <QrCode className="h-4 w-4" />
      <span>{t('qrCode.button')}</span>
    </Button>
  )
}
