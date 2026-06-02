'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { BASE_URL } from '@/lib/api'

/**
 * Session check interval in milliseconds.
 * Checks every 60 seconds to balance responsiveness with network efficiency.
 */
const SESSION_CHECK_INTERVAL_MS = 60 * 1000

/**
 * Session expired message in Bangla, stored as a URL search param.
 */
const SESSION_EXPIRED_MESSAGE = 'সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।'

/**
 * Hook that periodically checks portal session validity.
 * When the session expires (after 30 minutes of inactivity),
 * redirects the renter back to `/f/{flatSlug}` with a session expired message.
 *
 * @param flatSlug - The flat slug to redirect back to on session expiry
 * @param enabled - Whether session checking is active (default: true)
 */
export function useSessionExpiry(flatSlug: string, enabled = true): void {
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/portal/flat/${flatSlug}/session`,
        {
          method: 'GET',
          credentials: 'include',
        },
      )

      if (!response.ok) {
        // Network or server error — don't redirect on transient failures
        return
      }

      const data: { valid: boolean } = await response.json()

      if (!data.valid) {
        // Session expired — redirect to flat portal with expired message
        const redirectUrl = `/f/${flatSlug}?session_expired=true`
        router.replace(redirectUrl)
      }
    } catch {
      // Silently ignore network errors — don't disrupt the user on transient failures
    }
  }, [flatSlug, router])

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Run an initial check immediately
    checkSession()

    // Set up periodic checks
    intervalRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, checkSession])
}

/**
 * The session expired message constant, exported for use in the portal page
 * to display the Bangla message when redirected due to session expiry.
 */
export const SESSION_EXPIRED_PARAM = 'session_expired'
export const SESSION_EXPIRED_BANGLA_MESSAGE = SESSION_EXPIRED_MESSAGE
