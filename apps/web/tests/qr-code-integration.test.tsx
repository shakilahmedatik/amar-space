// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BulkQrDownloadButton } from '../components/qr-code/bulk-qr-download-button'
import { QrCodeDialog } from '../components/qr-code/qr-code-dialog'
import { I18nProvider } from '../lib/i18n/context'
import * as qrCodeUtils from '../lib/qr-code-utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient()
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(I18nProvider, { initialLocale: 'en' } as any, ui),
    ),
  )
}

function createBlobResponse(content = 'fake-image-data', type = 'image/png') {
  const blob = new Blob([content], { type })
  return new Response(blob, { status: 200, headers: { 'Content-Type': type } })
}

// ---------------------------------------------------------------------------
// Integration Test: Full QR Code Flow
// ---------------------------------------------------------------------------

describe('Integration: Full QR code flow', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    cleanup()
  })

  it('open dialog, fetch QR code, display image, and download', async () => {
    // Mock fetch to return a PNG blob
    globalThis.fetch = vi
      .fn()
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString()
        if (url.includes('/api/flats/') && url.includes('qr-code')) {
          return createBlobResponse('png-image-data', 'image/png')
        }
        // For the download flow (fetching the blob URL)
        if (url.startsWith('blob:')) {
          return createBlobResponse('png-image-data', 'image/png')
        }
        return new Response('Not found', { status: 404 })
      }) as typeof fetch

    // Mock downloadBlob to verify it gets called
    const downloadBlobSpy = vi
      .spyOn(qrCodeUtils, 'downloadBlob')
      .mockImplementation(() => {})

    renderWithProviders(
      React.createElement(QrCodeDialog, {
        open: true,
        onOpenChange: () => {},
        flatId: 'flat-123',
        flatNumber: '101A',
        buildingName: 'Green Tower',
      }),
    )

    // Verify loading state appears initially
    expect(screen.getByText('Generating...')).toBeDefined()

    // Wait for the image to appear after fetch resolves
    await waitFor(() => {
      const img = document.querySelector('img')
      expect(img).not.toBeNull()
    })

    // Verify the image has correct alt text
    const img = document.querySelector('img')
    expect(img?.getAttribute('alt')).toContain('101A')
    expect(img?.getAttribute('alt')).toContain('Green Tower')

    // Verify flat number and building name are displayed as text
    expect(screen.getByText('101A')).toBeDefined()
    expect(screen.getByText('Green Tower')).toBeDefined()

    // Click the download button
    const downloadButton = screen.getByText('Download')
    expect(downloadButton).toBeDefined()
    fireEvent.click(downloadButton)

    // Verify downloadBlob was called with correct filename
    await waitFor(() => {
      expect(downloadBlobSpy).toHaveBeenCalled()
      const [, filename] = downloadBlobSpy.mock.calls[0]!
      expect(filename).toBe('101A_qr.png')
    })

    downloadBlobSpy.mockRestore()
  })

  it('open dialog, select different size, verify API call with new size', async () => {
    const fetchCalls: string[] = []

    globalThis.fetch = vi
      .fn()
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString()
        fetchCalls.push(url)
        if (url.includes('/api/flats/') && url.includes('qr-code')) {
          return createBlobResponse('png-image-data', 'image/png')
        }
        return new Response('Not found', { status: 404 })
      }) as typeof fetch

    renderWithProviders(
      React.createElement(QrCodeDialog, {
        open: true,
        onOpenChange: () => {},
        flatId: 'flat-456',
        flatNumber: '202B',
        buildingName: 'Blue Heights',
      }),
    )

    // Wait for the image to load (loading finishes, size selector becomes enabled)
    await waitFor(() => {
      const img = document.querySelector('img')
      expect(img).not.toBeNull()
    })

    // Verify initial fetch was made with default size (300)
    const hasDefaultSizeCall = fetchCalls.some(
      (url) => url.includes('size=300') && url.includes('flat-456'),
    )
    expect(hasDefaultSizeCall).toBe(true)

    // Select a different size (500px) using role query
    const size500Radio = screen.getByRole('radio', { name: '500px' })
    fireEvent.click(size500Radio)

    // Verify a new API call is made with size=500
    await waitFor(() => {
      const hasNewSizeCall = fetchCalls.some(
        (url) => url.includes('size=500') && url.includes('flat-456'),
      )
      expect(hasNewSizeCall).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// Integration Test: Bulk Download
// ---------------------------------------------------------------------------

describe('Integration: Bulk QR code download', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    cleanup()
  })

  it('click bulk download, verify API call, verify file download triggered', async () => {
    // Mock fetch to return a ZIP blob
    globalThis.fetch = vi
      .fn()
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString()
        if (url.includes('/api/buildings/') && url.includes('qr-codes')) {
          return createBlobResponse('zip-file-data', 'application/zip')
        }
        return new Response('Not found', { status: 404 })
      }) as typeof fetch

    // Mock downloadBlob to verify it gets called
    const downloadBlobSpy = vi
      .spyOn(qrCodeUtils, 'downloadBlob')
      .mockImplementation(() => {})

    renderWithProviders(
      React.createElement(BulkQrDownloadButton, {
        buildingId: 'building-789',
        buildingName: 'Sunrise Apartments',
      }),
    )

    // Click the bulk download button
    const bulkButton = screen.getByText('Download All QR Codes')
    fireEvent.click(bulkButton)

    // Verify the API call was made to the correct endpoint
    await waitFor(() => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
      const calls = fetchMock.mock.calls
      const hasBulkCall = calls.some((call: unknown[]) =>
        call[0]?.toString().includes('/api/buildings/building-789/qr-codes'),
      )
      expect(hasBulkCall).toBe(true)
    })

    // Verify downloadBlob was called with the correct filename
    await waitFor(() => {
      expect(downloadBlobSpy).toHaveBeenCalled()
      const [, filename] = downloadBlobSpy.mock.calls[0]!
      expect(filename).toBe('Sunrise_Apartments_qr_codes.zip')
    })

    downloadBlobSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// Integration Test: Error Recovery
// ---------------------------------------------------------------------------

describe('Integration: Error recovery', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    cleanup()
  })

  it('simulate network failure, show error, retry, succeed on second attempt', async () => {
    let callCount = 0

    globalThis.fetch = vi
      .fn()
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString()
        if (url.includes('/api/flats/') && url.includes('qr-code')) {
          callCount++
          if (callCount === 1) {
            // First call fails with network error
            throw new Error('Network error')
          }
          // Second call succeeds
          return createBlobResponse('png-image-data', 'image/png')
        }
        return new Response('Not found', { status: 404 })
      }) as typeof fetch

    renderWithProviders(
      React.createElement(QrCodeDialog, {
        open: true,
        onOpenChange: () => {},
        flatId: 'flat-err',
        flatNumber: '303C',
        buildingName: 'Error Tower',
      }),
    )

    // Wait for error state to appear
    await waitFor(() => {
      expect(screen.getByText('Connection error')).toBeDefined()
    })

    // Verify retry button is visible and enabled
    const retryButton = screen.getByText('Retry')
    expect(retryButton).toBeDefined()

    // Click retry
    fireEvent.click(retryButton)

    // Wait for the image to appear after successful retry
    await waitFor(() => {
      const img = document.querySelector('img')
      expect(img).not.toBeNull()
    })

    // Verify the error message is gone
    expect(screen.queryByText('Connection error')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Integration Test: Timeout
// ---------------------------------------------------------------------------

describe('Integration: Timeout handling', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    cleanup()
  })

  it('simulate abort (timeout) and verify error state is shown', async () => {
    // Mock fetch to immediately reject with AbortError, simulating what happens
    // when the 15-second timeout fires and aborts the request via AbortController
    globalThis.fetch = vi
      .fn()
      .mockImplementation((_input: RequestInfo | URL, _init?: RequestInit) => {
        return Promise.reject(
          new DOMException('The operation was aborted.', 'AbortError'),
        )
      }) as typeof fetch

    renderWithProviders(
      React.createElement(QrCodeDialog, {
        open: true,
        onOpenChange: () => {},
        flatId: 'flat-timeout',
        flatNumber: '404D',
        buildingName: 'Timeout Tower',
      }),
    )

    // Verify error state appears after the aborted fetch
    await waitFor(() => {
      expect(screen.getByText('Connection error')).toBeDefined()
    })

    // Verify retry button is available
    expect(screen.getByText('Retry')).toBeDefined()
  })
})
