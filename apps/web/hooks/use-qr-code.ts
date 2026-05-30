'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { BASE_URL } from '@/lib/api'

interface UseQrCodeOptions {
  flatId: string
  size?: number
  enabled?: boolean
}

interface UseQrCodeReturn {
  blobUrl: string | null
  isLoading: boolean
  error: Error | null
  retryCount: number
  retry: () => void
  isRetryDisabled: boolean
}

/**
 * TanStack Query hook for fetching a QR code image as a blob.
 * Handles timeout (15s), retry tracking, and blob URL cleanup.
 * Validates: Requirements 1.3, 2.3, 3.3, 3.4, 7.1, 7.5, 7.6, 7.7
 */
export function useQrCode({
  flatId,
  size = 300,
  enabled = false,
}: UseQrCodeOptions): UseQrCodeReturn {
  const queryClient = useQueryClient()
  const retryCountRef = useRef(0)
  const [retryCount, setRetryCount] = useState(0)
  const blobUrlRef = useRef<string | null>(null)

  const queryKey = ['qr-code', flatId, size] as const

  const { data, isLoading, error } = useQuery<Blob, Error>({
    queryKey,
    queryFn: async ({ signal }) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15_000)

      // Forward the query cancellation signal to our controller
      const onAbort = () => controller.abort()
      signal?.addEventListener('abort', onAbort)

      try {
        const response = await fetch(
          `${BASE_URL}/api/flats/${flatId}/qr-code?size=${size}&format=image`,
          {
            credentials: 'include',
            signal: controller.signal,
          },
        )

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({
            message: 'Request failed',
          }))
          throw new Error(errorBody.message || `HTTP ${response.status}`)
        }

        return await response.blob()
      } finally {
        clearTimeout(timeoutId)
        signal?.removeEventListener('abort', onAbort)
      }
    },
    enabled: enabled && !!flatId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  // Track retry count: increment on error, reset on success
  useEffect(() => {
    if (error) {
      retryCountRef.current += 1
      setRetryCount(retryCountRef.current)
    }
  }, [error])

  useEffect(() => {
    if (data) {
      retryCountRef.current = 0
      setRetryCount(0)
    }
  }, [data])

  // Create and clean up blob URLs
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (data) {
      const url = URL.createObjectURL(data)
      blobUrlRef.current = url
      setBlobUrl(url)

      return () => {
        URL.revokeObjectURL(url)
        blobUrlRef.current = null
      }
    }
    setBlobUrl(null)
  }, [data])

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
    }
  }, [])

  const retry = () => {
    queryClient.invalidateQueries({ queryKey })
  }

  const isRetryDisabled = retryCount >= 3

  return {
    blobUrl,
    isLoading,
    error: error ?? null,
    retryCount,
    retry,
    isRetryDisabled,
  }
}
