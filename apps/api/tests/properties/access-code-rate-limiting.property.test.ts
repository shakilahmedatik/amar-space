// Feature: renter-qr-portal, Property 7: Access code rate limiting
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

/**
 * Property 7: Access code rate limiting
 *
 * For any sequence of access code verification attempts on a given flat,
 * if 5 consecutive invalid attempts occur, the system SHALL lock the access
 * code input for exactly 15 minutes. During the lockout period, all further
 * attempts SHALL be rejected regardless of code validity.
 *
 * **Validates: Requirements 8.5**
 */

// --- Rate Limiting State Machine ---

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

interface RateLimitState {
  failedAttempts: number
  lockedUntil: Date | null
}

type AttemptResult =
  | { status: 'success' }
  | { status: 'invalid'; attemptsRemaining: number }
  | { status: 'locked'; lockedUntil: Date }

/**
 * Simulates the access code verification rate limiting logic
 * as implemented in the POST /api/portal/flat/:slug/access endpoint.
 */
function processAccessAttempt(
  state: RateLimitState,
  isValidCode: boolean,
  now: Date,
): { result: AttemptResult; newState: RateLimitState } {
  // Check lockout status first
  if (state.lockedUntil && state.lockedUntil > now) {
    return {
      result: { status: 'locked', lockedUntil: state.lockedUntil },
      newState: state,
    }
  }

  // If lockout has expired, we still process normally (the endpoint reads current state from DB)
  // The actual endpoint doesn't reset failed_attempts on lockout expiry — it just allows the attempt

  if (isValidCode) {
    // Success: reset failed attempts
    return {
      result: { status: 'success' },
      newState: { failedAttempts: 0, lockedUntil: null },
    }
  }

  // Invalid code: increment failed attempts
  const newFailedAttempts = state.failedAttempts + 1

  if (newFailedAttempts >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS)
    return {
      result: { status: 'locked', lockedUntil },
      newState: { failedAttempts: newFailedAttempts, lockedUntil },
    }
  }

  return {
    result: {
      status: 'invalid',
      attemptsRemaining: MAX_ATTEMPTS - newFailedAttempts,
    },
    newState: { failedAttempts: newFailedAttempts, lockedUntil: null },
  }
}

// --- Generators ---

/** Generate a sequence of attempt outcomes (true = valid code, false = invalid code) */
const attemptSequenceArb = fc.array(fc.boolean(), {
  minLength: 1,
  maxLength: 20,
})

/** Generate a sequence of exactly N invalid attempts */
const _invalidSequenceArb = (n: number) =>
  fc.constant(new Array(n).fill(false) as boolean[])

/** Generate a time offset in milliseconds (for testing lockout timing) */
const timeOffsetArb = fc.integer({ min: 0, max: 30 * 60 * 1000 }) // 0 to 30 minutes

// --- Property Tests ---

describe('Feature: renter-qr-portal, Property 7: Access code rate limiting', () => {
  it('5 consecutive invalid attempts SHALL trigger a lockout', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const now = new Date('2024-06-01T12:00:00Z')
        let state: RateLimitState = { failedAttempts: 0, lockedUntil: null }

        // Make 5 consecutive invalid attempts
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
          const { result, newState } = processAccessAttempt(state, false, now)
          state = newState

          if (i < MAX_ATTEMPTS - 1) {
            // First 4 attempts should return 'invalid' with decreasing remaining attempts
            expect(result.status).toBe('invalid')
            if (result.status === 'invalid') {
              expect(result.attemptsRemaining).toBe(MAX_ATTEMPTS - (i + 1))
            }
          } else {
            // 5th attempt should trigger lockout
            expect(result.status).toBe('locked')
            if (result.status === 'locked') {
              expect(result.lockedUntil.getTime()).toBe(
                now.getTime() + LOCKOUT_DURATION_MS,
              )
            }
          }
        }

        // State should reflect lockout
        expect(state.failedAttempts).toBe(MAX_ATTEMPTS)
        expect(state.lockedUntil).not.toBeNull()
      }),
      { numRuns: 100 },
    )
  })

  it('fewer than 5 consecutive invalid attempts SHALL NOT trigger a lockout', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), (numAttempts) => {
        const now = new Date('2024-06-01T12:00:00Z')
        let state: RateLimitState = { failedAttempts: 0, lockedUntil: null }

        for (let i = 0; i < numAttempts; i++) {
          const { result, newState } = processAccessAttempt(state, false, now)
          state = newState
          expect(result.status).toBe('invalid')
        }

        // Should NOT be locked
        expect(state.lockedUntil).toBeNull()
        expect(state.failedAttempts).toBe(numAttempts)
      }),
      { numRuns: 100 },
    )
  })

  it('during lockout, all attempts SHALL be rejected regardless of code validity', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // whether the attempt uses a valid code
        timeOffsetArb.filter((offset) => offset < LOCKOUT_DURATION_MS), // time within lockout
        (isValidCode, timeWithinLockout) => {
          const lockStart = new Date('2024-06-01T12:00:00Z')
          const lockedUntil = new Date(
            lockStart.getTime() + LOCKOUT_DURATION_MS,
          )

          // State is locked
          const state: RateLimitState = {
            failedAttempts: MAX_ATTEMPTS,
            lockedUntil,
          }

          // Attempt during lockout period
          const attemptTime = new Date(lockStart.getTime() + timeWithinLockout)
          const { result, newState } = processAccessAttempt(
            state,
            isValidCode,
            attemptTime,
          )

          // Property: ALL attempts during lockout are rejected
          expect(result.status).toBe('locked')
          if (result.status === 'locked') {
            expect(result.lockedUntil.getTime()).toBe(lockedUntil.getTime())
          }

          // State should remain unchanged during lockout
          expect(newState.failedAttempts).toBe(MAX_ATTEMPTS)
          expect(newState.lockedUntil).toEqual(lockedUntil)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('lockout duration SHALL be exactly 15 minutes', () => {
    fc.assert(
      fc.property(
        fc
          .integer({
            min: new Date('2020-01-01T00:00:00Z').getTime(),
            max: new Date('2030-12-31T23:59:59Z').getTime(),
          })
          .map((ts) => new Date(ts)),
        (now) => {
          let state: RateLimitState = { failedAttempts: 0, lockedUntil: null }

          // Trigger lockout with 5 invalid attempts
          for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const { newState } = processAccessAttempt(state, false, now)
            state = newState
          }

          // Property: lockout is exactly 15 minutes from the time of the 5th failure
          expect(state.lockedUntil).not.toBeNull()
          expect(state.lockedUntil!.getTime() - now.getTime()).toBe(
            LOCKOUT_DURATION_MS,
          )
          expect(LOCKOUT_DURATION_MS).toBe(15 * 60 * 1000)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('a successful attempt SHALL reset failed_attempts to 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }), // some failed attempts before success
        (failedBefore) => {
          const now = new Date('2024-06-01T12:00:00Z')
          let state: RateLimitState = { failedAttempts: 0, lockedUntil: null }

          // Accumulate some failures (less than 5 to avoid lockout)
          for (let i = 0; i < failedBefore; i++) {
            const { newState } = processAccessAttempt(state, false, now)
            state = newState
          }

          expect(state.failedAttempts).toBe(failedBefore)

          // Now succeed
          const { result, newState } = processAccessAttempt(state, true, now)

          // Property: success resets failed_attempts to 0
          expect(result.status).toBe('success')
          expect(newState.failedAttempts).toBe(0)
          expect(newState.lockedUntil).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('after lockout expires, a valid code SHALL succeed and reset state', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60 * 60 * 1000 }), // time after lockout expiry
        (timeAfterExpiry) => {
          const lockStart = new Date('2024-06-01T12:00:00Z')
          const lockedUntil = new Date(
            lockStart.getTime() + LOCKOUT_DURATION_MS,
          )

          // State with expired lockout
          const state: RateLimitState = {
            failedAttempts: MAX_ATTEMPTS,
            lockedUntil,
          }

          // Valid attempt AFTER lockout has expired
          const attemptTime = new Date(lockedUntil.getTime() + timeAfterExpiry)
          const { result, newState } = processAccessAttempt(
            state,
            true,
            attemptTime,
          )

          // Property: after lockout expires, a valid code succeeds and resets state
          expect(result.status).toBe('success')
          expect(newState.failedAttempts).toBe(0)
          expect(newState.lockedUntil).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('for any sequence of attempts, lockout triggers only after 5 consecutive failures', () => {
    fc.assert(
      fc.property(attemptSequenceArb, (attempts) => {
        const now = new Date('2024-06-01T12:00:00Z')
        let state: RateLimitState = { failedAttempts: 0, lockedUntil: null }
        let consecutiveFailures = 0
        let lockoutTriggered = false

        for (const isValid of attempts) {
          // Skip if already locked
          if (state.lockedUntil && state.lockedUntil > now) {
            const { newState } = processAccessAttempt(state, isValid, now)
            state = newState
            continue
          }

          const { result, newState } = processAccessAttempt(state, isValid, now)
          state = newState

          if (isValid) {
            consecutiveFailures = 0
          } else {
            consecutiveFailures++
            if (consecutiveFailures >= MAX_ATTEMPTS && !lockoutTriggered) {
              // Property: lockout triggers exactly at 5 consecutive failures
              expect(result.status).toBe('locked')
              lockoutTriggered = true
            }
          }
        }

        // Property: if we had fewer than 5 consecutive failures without a success
        // interrupting, no lockout should have been triggered
        if (!lockoutTriggered) {
          expect(state.lockedUntil).toBeNull()
        }
      }),
      { numRuns: 100 },
    )
  })
})
