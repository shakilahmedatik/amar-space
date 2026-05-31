// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the useQrCode hook
const mockRetry = vi.fn()
vi.mock('@/hooks/use-qr-code', () => ({
  useQrCode: vi.fn(),
}))

// Mock qr-code-utils
vi.mock('@/lib/qr-code-utils', () => ({
  downloadBlob: vi.fn(),
  getQrFilename: vi.fn((flatNumber: string) => `${flatNumber}_qr.png`),
  printQrCode: vi.fn(),
}))

import { useQrCode } from '@/hooks/use-qr-code'
import { QrCodeDialog } from '../components/qr-code/qr-code-dialog'
import { I18nProvider } from '../lib/i18n/context'

// Helper to render the dialog within I18nProvider
function renderDialog(
  props?: Partial<React.ComponentProps<typeof QrCodeDialog>>,
) {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    flatId: 'flat-123',
    flatNumber: '101',
    buildingName: 'Test Building',
  }

  return render(
    React.createElement(
      I18nProvider,
      { initialLocale: 'en' } as unknown as React.ComponentProps<
        typeof I18nProvider
      >,
      React.createElement(QrCodeDialog, { ...defaultProps, ...props }),
    ),
  )
}

describe('QrCodeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock: loading state
    vi.mocked(useQrCode).mockReturnValue({
      blobUrl: null,
      isLoading: true,
      error: null,
      retryCount: 0,
      retry: mockRetry,
      isRetryDisabled: false,
    })
  })

  afterEach(() => {
    cleanup()
  })

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders spinner and localized "Generating..." message', () => {
      vi.mocked(useQrCode).mockReturnValue({
        blobUrl: null,
        isLoading: true,
        error: null,
        retryCount: 0,
        retry: mockRetry,
        isRetryDisabled: false,
      })

      renderDialog()

      // The spinner is rendered via Loader2 icon with animate-spin class
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).not.toBeNull()

      // The localized "Generating..." message should be visible
      expect(screen.getByText('Generating...')).toBeDefined()
    })

    it('disables download and print buttons during loading', () => {
      vi.mocked(useQrCode).mockReturnValue({
        blobUrl: null,
        isLoading: true,
        error: null,
        retryCount: 0,
        retry: mockRetry,
        isRetryDisabled: false,
      })

      renderDialog()

      const downloadButton = screen.getByRole('button', { name: /download/i })
      const printButton = screen.getByRole('button', { name: /print/i })

      expect(downloadButton.hasAttribute('disabled')).toBe(true)
      expect(printButton.hasAttribute('disabled')).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Success state
  // -------------------------------------------------------------------------
  describe('success state', () => {
    beforeEach(() => {
      vi.mocked(useQrCode).mockReturnValue({
        blobUrl: 'blob:http://localhost/test-qr-image',
        isLoading: false,
        error: null,
        retryCount: 0,
        retry: mockRetry,
        isRetryDisabled: false,
      })
    })

    it('renders QR code image', () => {
      renderDialog()

      const img = document.querySelector('img')
      expect(img).not.toBeNull()
      expect(img!.getAttribute('src')).toBe(
        'blob:http://localhost/test-qr-image',
      )
    })

    it('renders download button enabled', () => {
      renderDialog()

      const downloadButton = screen.getByRole('button', { name: /download/i })
      expect(downloadButton.hasAttribute('disabled')).toBe(false)
    })

    it('renders print button enabled', () => {
      renderDialog()

      const printButton = screen.getByRole('button', { name: /print/i })
      expect(printButton.hasAttribute('disabled')).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe('error state', () => {
    it('renders error message and retry button', () => {
      vi.mocked(useQrCode).mockReturnValue({
        blobUrl: null,
        isLoading: false,
        error: new Error('Network error'),
        retryCount: 1,
        retry: mockRetry,
        isRetryDisabled: false,
      })

      renderDialog()

      // Error message should be visible (localized "Connection error")
      expect(screen.getByText('Connection error')).toBeDefined()

      // Retry button should be visible and enabled
      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeDefined()
      expect(retryButton.hasAttribute('disabled')).toBe(false)
    })

    it('disables download and print buttons during error state', () => {
      vi.mocked(useQrCode).mockReturnValue({
        blobUrl: null,
        isLoading: false,
        error: new Error('Network error'),
        retryCount: 1,
        retry: mockRetry,
        isRetryDisabled: false,
      })

      renderDialog()

      const downloadButton = screen.getByRole('button', { name: /download/i })
      const printButton = screen.getByRole('button', { name: /print/i })

      expect(downloadButton.hasAttribute('disabled')).toBe(true)
      expect(printButton.hasAttribute('disabled')).toBe(true)
    })

    it('disables retry button after 3 consecutive failures', () => {
      vi.mocked(useQrCode).mockReturnValue({
        blobUrl: null,
        isLoading: false,
        error: new Error('Network error'),
        retryCount: 3,
        retry: mockRetry,
        isRetryDisabled: true,
      })

      renderDialog()

      // After 3 failures, the retry button should not be rendered
      // and "Please try again later" message should appear
      expect(screen.getByText('Please try again later')).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Responsive layout
  // -------------------------------------------------------------------------
  describe('responsive layout', () => {
    it('dialog content has full-screen sheet classes for mobile and centered modal classes for desktop', () => {
      vi.mocked(useQrCode).mockReturnValue({
        blobUrl: 'blob:http://localhost/test-qr-image',
        isLoading: false,
        error: null,
        retryCount: 0,
        retry: mockRetry,
        isRetryDisabled: false,
      })

      renderDialog()

      // The dialog content element should have the responsive classes
      // Mobile: fixed inset-0 (full-screen sheet)
      // Desktop: sm:inset-auto sm:max-w-[480px] (centered modal)
      const dialogContent = document.querySelector('[role="dialog"]')
      expect(dialogContent).not.toBeNull()

      const classList = dialogContent!.className
      // Full-screen sheet below 640px
      expect(classList).toContain('fixed')
      expect(classList).toContain('inset-0')
      // Centered modal above 640px
      expect(classList).toContain('sm:inset-auto')
      expect(classList).toContain('sm:max-w-[480px]')
    })
  })
})
