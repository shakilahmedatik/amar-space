'use client'

import { useMutation } from '@tanstack/react-query'
import { KeyRound, Lock, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { BASE_URL } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AccessCodeInputProps {
  flatSlug: string
  flatStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
  className?: string
  onSuccess?: () => void
}

interface AccessCodeResponse {
  success: boolean
  message: string
  redirectUrl?: string
}

interface AccessCodeErrorResponse {
  error: string
  message: string
  attemptsRemaining?: number
  lockedUntil?: string
}

/**
 * Bangla numerals mapping for countdown display.
 */
const BANGLA_DIGITS: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
}

/**
 * Converts a number to Bangla numeral string.
 */
function toBanglaNumerals(num: number): string {
  return String(num).replace(/[0-9]/g, (digit) => BANGLA_DIGITS[digit] || digit)
}

/**
 * Formats remaining lockout seconds into a Bangla time string.
 * Example: 125 → "২ মিনিট ৫ সেকেন্ড"
 */
function formatLockoutTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0 && remainingSeconds > 0) {
    return `${toBanglaNumerals(minutes)} মিনিট ${toBanglaNumerals(remainingSeconds)} সেকেন্ড`
  }
  if (minutes > 0) {
    return `${toBanglaNumerals(minutes)} মিনিট`
  }
  return `${toBanglaNumerals(remainingSeconds)} সেকেন্ড`
}

/**
 * Access code input component — 6-digit numeric PIN entry for renter authentication.
 *
 * Features:
 * - Only shown when flat status is OCCUPIED
 * - 6-digit numeric-only input (filters non-numeric characters)
 * - Bangla error messages on invalid code
 * - Lockout message with remaining time when locked
 * - Clears input on failed attempt
 * - Tracks "Access Code Attempted" and "Access Granted" analytics events
 * - Submits via TanStack Query mutation to POST /api/portal/flat/:slug/access
 * - Redirects to /renter/dashboard on success
 */
export function AccessCodeInput({
  flatSlug,
  flatStatus,
  className,
  onSuccess,
}: AccessCodeInputProps) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null)
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) {
      setLockoutRemaining(0)
      return
    }

    function updateRemaining() {
      const now = new Date()
      const remaining = Math.max(
        0,
        Math.ceil((lockedUntil!.getTime() - now.getTime()) / 1000),
      )
      setLockoutRemaining(remaining)

      if (remaining <= 0) {
        setLockedUntil(null)
        setErrorMessage(null)
      }
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [lockedUntil])

  // Mutation for access code verification
  const accessMutation = useMutation<
    AccessCodeResponse,
    AccessCodeErrorResponse,
    string
  >({
    mutationFn: async (accessCode: string) => {
      const response = await fetch(
        `${BASE_URL}/api/portal/flat/${flatSlug}/access`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code: accessCode }),
        },
      )

      if (response.status === 401) {
        const errorData: AccessCodeErrorResponse = await response.json()
        throw errorData
      }

      if (response.status === 429) {
        const errorData: AccessCodeErrorResponse = await response.json()
        throw errorData
      }

      if (!response.ok) {
        throw {
          error: 'UNKNOWN',
          message: 'সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
        } as AccessCodeErrorResponse
      }

      return response.json()
    },
    onSuccess: (data) => {
      setErrorMessage(null)
      trackEvent('Access Granted', flatSlug)
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(data.redirectUrl || '/dashboard')
      }
    },
    onError: (error: AccessCodeErrorResponse) => {
      // Track failed attempt
      trackEvent('Access Code Attempted', flatSlug)

      // Clear input on failure
      setCode('')
      inputRef.current?.focus()

      if (error.error === 'LOCKED' && error.lockedUntil) {
        setLockedUntil(new Date(error.lockedUntil))
        setErrorMessage(error.message)
      } else {
        setErrorMessage(error.message || 'অবৈধ অ্যাক্সেস কোড')
      }
    },
  })

  /**
   * Handles input change — filters non-numeric characters and limits to 6 digits.
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const filtered = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
      setCode(filtered)

      // Clear error when user starts typing again
      if (errorMessage && !lockedUntil) {
        setErrorMessage(null)
      }
    },
    [errorMessage, lockedUntil],
  )

  /**
   * Handles form submission.
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (code.length !== 6) {
        setErrorMessage('অনুগ্রহ করে ৬ সংখ্যার কোড দিন')
        return
      }

      if (lockedUntil) {
        return
      }

      accessMutation.mutate(code)
    },
    [code, lockedUntil, accessMutation],
  )

  // Only show when flat status is OCCUPIED
  if (flatStatus !== 'OCCUPIED') {
    return null
  }

  const isLocked = lockedUntil !== null && lockoutRemaining > 0
  const isSubmitting = accessMutation.isPending

  return (
    <section
      aria-label="রেন্টার অ্যাক্সেস"
      className={cn('flex flex-col gap-4', className)}
    >
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
        <KeyRound className="h-5 w-5" aria-hidden />
        রেন্টার অ্যাক্সেস
      </h2>

      <div className="rounded-lg border border-hairline bg-white p-5">
        <p className="mb-4 text-base text-steel">
          আপনার ড্যাশবোর্ডে প্রবেশ করতে ৬ সংখ্যার অ্যাক্সেস কোড দিন
        </p>

        {/* Lockout message */}
        {isLocked && (
          <div
            className="mb-4 flex items-center gap-3 rounded-lg bg-error-bg p-4"
            role="alert"
          >
            <Lock className="h-5 w-5 shrink-0 text-error-text" aria-hidden />
            <div className="min-w-0">
              <p className="text-base font-medium text-error-text">
                অ্যাক্সেস কোড লক করা হয়েছে
              </p>
              <p className="mt-1 text-base text-error-text/80">
                {formatLockoutTime(lockoutRemaining)} পর আবার চেষ্টা করুন
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="access-code"
              className="mb-1.5 block text-base font-medium text-ink"
            >
              অ্যাক্সেস কোড
            </label>
            <input
              ref={inputRef}
              id="access-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={handleInputChange}
              disabled={isLocked || isSubmitting}
              placeholder="৬ সংখ্যার কোড"
              autoComplete="one-time-code"
              className={cn(
                'w-full rounded-lg border px-4 py-3 text-center text-xl font-mono tracking-[0.3em] transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary/50',
                'disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60',
                errorMessage && !isLocked
                  ? 'border-error-text bg-error-bg/30'
                  : 'border-hairline bg-white',
              )}
              aria-invalid={!!errorMessage}
              aria-describedby={errorMessage ? 'access-code-error' : undefined}
            />
          </div>

          {/* Error message */}
          {errorMessage && !isLocked && (
            <div
              id="access-code-error"
              className="flex items-center gap-2 text-base text-error-text"
              role="alert"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || isLocked || isSubmitting}
            className={cn(
              'flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-medium transition-colors',
              'bg-primary text-white',
              'hover:bg-primary/90 active:bg-primary/80',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <KeyRound className="h-5 w-5" aria-hidden />
            {isSubmitting ? 'যাচাই করা হচ্ছে...' : 'প্রবেশ করুন'}
          </button>
        </form>
      </div>
    </section>
  )
}
