/**
 * Core API fetch utility for AmarSpace.
 * Provides a single BASE_URL constant with fallback and a server-side warning
 * when NEXT_PUBLIC_API_URL is not configured.
 */

// Emit a warning on the server side when the env var is missing so developers
// notice the misconfiguration at build/startup time rather than at runtime.
if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    '[AmarSpace] NEXT_PUBLIC_API_URL is not set — falling back to http://localhost:3001',
  )
}

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

/**
 * Generic fetch wrapper with error handling.
 * All requests include credentials (session cookie) and default JSON headers.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    ...((options?.headers as Record<string, string>) ?? {}),
  }

  // Only set Content-Type to JSON when there's a body to send
  if (options?.body) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: 'Request failed',
    }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}
