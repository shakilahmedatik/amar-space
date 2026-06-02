'use client'

import { BASE_URL } from '@/lib/api'

const ANALYTICS_ENDPOINT = `${BASE_URL}/api/portal/analytics`

/**
 * Tracks a portal analytics event asynchronously without blocking UI.
 * Uses `navigator.sendBeacon` for reliability (survives page unloads),
 * with a fallback to a non-blocking fetch for environments that lack sendBeacon.
 * Failures are silently discarded — analytics must never impact user experience.
 *
 * @param event - The event name (e.g., "QR Scanned", "WhatsApp Clicked")
 * @param flatSlug - The flat slug identifier
 * @param metadata - Optional key-value pairs for additional event context
 */
export function trackEvent(
  event: string,
  flatSlug: string,
  metadata?: Record<string, string>,
): void {
  try {
    const payload = JSON.stringify({
      event,
      flatSlug,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      metadata,
    })

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon(ANALYTICS_ENDPOINT, blob)
    } else {
      fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Silently discard fetch failures
      })
    }
  } catch {
    // Silently discard any errors — analytics must never surface errors to users
  }
}
