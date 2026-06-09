'use client'

import * as RadioGroup from '@radix-ui/react-radio-group'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface SizeSelectorProps {
  value: number
  onChange: (size: number) => void
  disabled?: boolean
}

const SIZE_OPTIONS = [200, 300, 500, 800] as const

/**
 * Size selector for QR code generation.
 * Uses Radix RadioGroup for keyboard accessibility (arrow keys navigate, Enter/Space selects).
 * Responsive layout: inline on ≥640px, stacked on <640px.
 */
export function SizeSelector({ value, onChange, disabled }: SizeSelectorProps) {
  const { t } = useTranslation()

  return (
    <RadioGroup.Root
      value={String(value)}
      onValueChange={(val) => onChange(Number(val))}
      disabled={disabled}
      aria-label={t('qrCode.sizeLabel')}
      className="flex flex-col gap-2 sm:flex-row sm:gap-2"
    >
      {SIZE_OPTIONS.map((size) => (
        <RadioGroup.Item
          key={size}
          value={String(size)}
          className={cn(
            'min-h-11 min-w-[44px] cursor-pointer rounded-md border px-4 py-2 text-sm font-medium transition-colors',
            'flex items-center justify-center',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            value === size
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
          )}
        >
          {t(`qrCode.size${size}` as 'qrCode.size200')}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
