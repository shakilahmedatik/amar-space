/**
 * Auth client for communicating with the Better Auth API.
 * Handles sign-in, sign-up, sign-out, and session retrieval.
 */

import { BASE_URL } from './api'

interface SignInResponse {
  user?: {
    id: string
    email: string
    name?: string
    role: string
  }
  error?: {
    message: string
    code?: string
    status?: number
  }
}

interface SignInCredentials {
  email: string
  password: string
}

/**
 * Sign in with email and password.
 * Returns user data on success, or an error object on failure.
 */
export async function signIn(
  credentials: SignInCredentials,
): Promise<SignInResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    const status = response.status

    // Rate limit (429) — Requirement 2.3
    if (status === 429) {
      return {
        error: {
          message: 'RATE_LIMIT_EXCEEDED',
          code: 'RATE_LIMIT_EXCEEDED',
          status: 429,
        },
      }
    }

    // Auth failure (401) — Requirement 2.2: generic message
    if (status === 401) {
      return {
        error: {
          message: 'INVALID_CREDENTIALS',
          code: 'INVALID_CREDENTIALS',
          status: 401,
        },
      }
    }

    return {
      error: {
        message: 'UNKNOWN_ERROR',
        code: 'UNKNOWN_ERROR',
        status,
      },
    }
  }

  const data = await response.json()
  return { user: data.user ?? data }
}

/**
 * Get the current session.
 * Returns user data if authenticated, null otherwise.
 */
export async function getSession(): Promise<SignInResponse['user'] | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/get-session`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.user ?? null
  } catch {
    return null
  }
}

/**
 * Sign up with email and password.
 * Returns user data on success, or an error object on failure.
 *
 * Handles:
 * - 429: Rate limit exceeded (Requirement 1.8)
 * - 409/400 with EMAIL_EXISTS: Duplicate email (Requirement 1.3)
 * - 400 with validation errors: Field-level errors (Requirement 1.6)
 */
export async function signUp(
  credentials: SignInCredentials,
): Promise<SignUpResponse> {
  const response = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    const status = response.status

    // Rate limit (429) — Requirement 1.8
    if (status === 429) {
      return {
        error: {
          message: 'RATE_LIMIT_EXCEEDED',
          code: 'RATE_LIMIT_EXCEEDED',
          status: 429,
        },
      }
    }

    // Try to parse the error body for field-level errors
    try {
      const errorData = await response.json()

      // Duplicate email (Requirement 1.3)
      if (
        errorData.code === 'EMAIL_EXISTS' ||
        errorData.error === 'EMAIL_EXISTS' ||
        (status === 409 && errorData.message?.includes('email'))
      ) {
        return {
          error: {
            message: 'EMAIL_EXISTS',
            code: 'EMAIL_EXISTS',
            status,
          },
        }
      }

      // Field-level validation errors (Requirement 1.6)
      if (status === 400 && errorData.errors) {
        return {
          error: {
            message: 'VALIDATION_ERROR',
            code: 'VALIDATION_ERROR',
            status: 400,
            fieldErrors: errorData.errors,
          },
        }
      }

      return {
        error: {
          message: errorData.message || 'UNKNOWN_ERROR',
          code: errorData.code || 'UNKNOWN_ERROR',
          status,
        },
      }
    } catch {
      return {
        error: {
          message: 'UNKNOWN_ERROR',
          code: 'UNKNOWN_ERROR',
          status,
        },
      }
    }
  }

  const data = await response.json()
  return { user: data.user ?? data }
}

interface SignUpResponse {
  user?: {
    id: string
    email: string
    name?: string
    role: string
  }
  error?: {
    message: string
    code?: string
    status?: number
    fieldErrors?: Array<{ field: string; message: string; rule?: string }>
  }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  await fetch(`${BASE_URL}/api/auth/sign-out`, {
    method: 'POST',
    credentials: 'include',
  })
}
