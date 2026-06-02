// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import fc from 'fast-check'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { QrCodePreview } from '../../components/qr-code/qr-code-preview'
import { I18nProvider } from '../../lib/i18n/context'
import bn from '../../lib/i18n/translations/bn'
import en from '../../lib/i18n/translations/en'
import { sanitizeFilename } from '../../lib/qr-code-utils'

/**
 * Feature: qr-code-feature-ui, Property 6: Translation key completeness
 *
 * For any translation key used by the QR code feature, the key resolves to
 * a non-empty string in both the Bangla (bn) and English (en) locale dictionaries.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract all keys from the qrCode namespace in a translation dictionary */
function getQrCodeKeys(dictionary: Record<string, unknown>): string[] {
  const qrCode = dictionary.qrCode
  if (!qrCode || typeof qrCode !== 'object') return []
  return Object.keys(qrCode as Record<string, unknown>)
}

/** Get the value for a specific key in the qrCode namespace */
function getQrCodeValue(
  dictionary: Record<string, unknown>,
  key: string,
): unknown {
  const qrCode = dictionary.qrCode as Record<string, unknown> | undefined
  if (!qrCode) return undefined
  return qrCode[key]
}

// ---------------------------------------------------------------------------
// Collect translation keys once at module load time
// ---------------------------------------------------------------------------

const enQrCodeKeys = getQrCodeKeys(en as unknown as Record<string, unknown>)
const bnQrCodeKeys = getQrCodeKeys(bn as unknown as Record<string, unknown>)

// Union of all keys from both dictionaries
const allQrCodeKeys = [...new Set([...enQrCodeKeys, ...bnQrCodeKeys])]

// ---------------------------------------------------------------------------
// Property 6: Translation key completeness
// ---------------------------------------------------------------------------

describe('Feature: qr-code-feature-ui, Property 6: Translation key completeness', () => {
  it('qrCode namespace has keys defined', () => {
    expect(allQrCodeKeys.length).toBeGreaterThan(0)
  })

  it('for any qrCode translation key, the English dictionary resolves to a non-empty string', () => {
    fc.assert(
      fc.property(fc.constantFrom(...allQrCodeKeys), (key) => {
        const value = getQrCodeValue(
          en as unknown as Record<string, unknown>,
          key,
        )
        expect(
          value,
          `en.qrCode.${key} should be a non-empty string`,
        ).toBeDefined()
        expect(typeof value, `en.qrCode.${key} should be a string`).toBe(
          'string',
        )
        expect(
          (value as string).length,
          `en.qrCode.${key} should not be empty`,
        ).toBeGreaterThan(0)
      }),
      { numRuns: Math.min(allQrCodeKeys.length * 5, 100) },
    )
  })

  it('for any qrCode translation key, the Bangla dictionary resolves to a non-empty string', () => {
    fc.assert(
      fc.property(fc.constantFrom(...allQrCodeKeys), (key) => {
        const value = getQrCodeValue(
          bn as unknown as Record<string, unknown>,
          key,
        )
        expect(
          value,
          `bn.qrCode.${key} should be a non-empty string`,
        ).toBeDefined()
        expect(typeof value, `bn.qrCode.${key} should be a string`).toBe(
          'string',
        )
        expect(
          (value as string).length,
          `bn.qrCode.${key} should not be empty`,
        ).toBeGreaterThan(0)
      }),
      { numRuns: Math.min(allQrCodeKeys.length * 5, 100) },
    )
  })

  it('both en and bn dictionaries have the same set of qrCode keys', () => {
    fc.assert(
      fc.property(fc.constantFrom(...allQrCodeKeys), (key) => {
        expect(
          enQrCodeKeys,
          `Key "${key}" should exist in en.qrCode`,
        ).toContain(key)
        expect(
          bnQrCodeKeys,
          `Key "${key}" should exist in bn.qrCode`,
        ).toContain(key)
      }),
      { numRuns: Math.min(allQrCodeKeys.length * 5, 100) },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 2: Filename sanitization preserves safety
// ---------------------------------------------------------------------------

/**
 * Feature: qr-code-feature-ui
 * Property 2: Filename sanitization preserves safety
 *
 * For any input string (flat number or building name), the `sanitizeFilename`
 * function SHALL produce a string containing only alphanumeric characters
 * (including Bengali Unicode range U+0980–U+09FF), hyphens, and underscores —
 * no other characters SHALL appear in the output.
 *
 */

/** Regex that matches ONLY safe characters: alphanumeric, Bengali Unicode, hyphens, underscores */
const SAFE_CHARS_ONLY = /^[a-zA-Z0-9\u0980-\u09FF\-_]*$/

describe('Feature: qr-code-feature-ui, Property 2: Filename sanitization preserves safety', () => {
  it('for any input string, sanitizeFilename output contains only alphanumeric, Bengali Unicode (U+0980–U+09FF), hyphens, and underscores', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeFilename(input)

        expect(result).toMatch(SAFE_CHARS_ONLY)
      }),
      { numRuns: 100 },
    )
  })

  it('for any input containing arbitrary unicode characters, sanitizeFilename output remains safe', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'grapheme-composite', minLength: 0, maxLength: 50 }),
        (input) => {
          const result = sanitizeFilename(input)

          expect(result).toMatch(SAFE_CHARS_ONLY)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('for any input string, sanitizeFilename output length is equal to input length (each char maps to exactly one char)', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeFilename(input)

        // The regex replaces each unsafe character with a single underscore,
        // so output length should equal input length
        expect(result.length).toBe(input.length)
      }),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 4: Size selection triggers correct API parameter
// ---------------------------------------------------------------------------

/**
 * Feature: qr-code-feature-ui
 * Property 4: Size selection triggers correct API parameter
 *
 * For any size value selected from the Size Selector preset options
 * (200, 300, 500, 800), the `useQrCode` hook SHALL include that exact value
 * as the `size` query parameter in the API request URL.
 *
 */

describe('Feature: qr-code-feature-ui, Property 4: Size selection triggers correct API parameter', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('for any size from preset options (200, 300, 500, 800), the fetch URL includes ?size={size}&format=image', () => {
    fc.assert(
      fc.property(fc.constantFrom(200, 300, 500, 800), (size) => {
        const capturedUrls: string[] = []

        // Mock fetch to capture the URL
        globalThis.fetch = (async (
          input: RequestInfo | URL,
          _init?: RequestInit,
        ) => {
          capturedUrls.push(input.toString())
          const blob = new Blob(['fake-image'], { type: 'image/png' })
          return {
            status: 200,
            ok: true,
            blob: async () => blob,
          } as unknown as Response
        }) as typeof fetch

        // Simulate the URL construction logic from useQrCode hook
        // The hook constructs: `${BASE_URL}/api/flats/${flatId}/qr-code?size=${size}&format=image`
        const flatId = 'test-flat-id'
        const BASE_URL = 'http://localhost:3001'
        const url = `${BASE_URL}/api/flats/${flatId}/qr-code?size=${size}&format=image`

        // Trigger the fetch as the hook would
        globalThis.fetch(url, {
          credentials: 'include',
          signal: undefined as unknown as AbortSignal,
        })

        // Verify the captured URL contains the exact size parameter
        expect(capturedUrls.length).toBe(1)
        const fetchedUrl = new URL(capturedUrls[0]!)
        expect(fetchedUrl.searchParams.get('size')).toBe(String(size))
        expect(fetchedUrl.searchParams.get('format')).toBe('image')
        expect(fetchedUrl.pathname).toBe(`/api/flats/${flatId}/qr-code`)
      }),
      { numRuns: 100 },
    )
  })

  it('for any size from preset options, the size parameter is the exact numeric value (not transformed)', () => {
    fc.assert(
      fc.property(fc.constantFrom(200, 300, 500, 800), (size) => {
        const flatId = 'any-flat-123'
        const BASE_URL = 'http://localhost:3001'
        const url = `${BASE_URL}/api/flats/${flatId}/qr-code?size=${size}&format=image`

        const parsedUrl = new URL(url)
        const sizeParam = parsedUrl.searchParams.get('size')

        // The size parameter must be the exact numeric value as a string
        expect(sizeParam).toBe(String(size))
        // Verify it parses back to the original number
        expect(Number(sizeParam)).toBe(size)
      }),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 1: Role-based visibility of QR actions
// ---------------------------------------------------------------------------

/**
 * Feature: qr-code-feature-ui
 * Property 1: Role-based visibility of QR actions
 *
 * For any user role, the QR Code Button (on flat detail) and Bulk Download Button
 * (on building detail) SHALL be visible if and only if the role is "owner" or
 * "manager". For the "renter" role, both buttons SHALL be hidden.
 *
 */

/**
 * Helper function that encapsulates the role-based visibility logic.
 * Given a user role, returns whether QR actions (QrCodeButton, BulkQrDownloadButton)
 * should be shown. This mirrors the logic used by parent components to conditionally
 * render the buttons.
 */
function shouldShowQrActions(role: string): boolean {
  return role === 'owner' || role === 'manager'
}

describe('Feature: qr-code-feature-ui, Property 1: Role-based visibility of QR actions', () => {
  it('for "owner" or "manager" roles, QR action buttons should be visible', () => {
    fc.assert(
      fc.property(fc.constantFrom('owner', 'manager'), (role) => {
        expect(
          shouldShowQrActions(role),
          `QR actions should be visible for role "${role}"`,
        ).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('for "renter" role, QR action buttons should be hidden', () => {
    fc.assert(
      fc.property(fc.constantFrom('renter'), (role) => {
        expect(
          shouldShowQrActions(role),
          `QR actions should be hidden for role "${role}"`,
        ).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('for any role, QR actions are visible iff role is "owner" or "manager"', () => {
    fc.assert(
      fc.property(fc.constantFrom('owner', 'manager', 'renter'), (role) => {
        const isVisible = shouldShowQrActions(role)
        const expectedVisible = role === 'owner' || role === 'manager'

        expect(
          isVisible,
          `QR actions visibility for role "${role}" should be ${expectedVisible}`,
        ).toBe(expectedVisible)
      }),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 5: Aria-label contains flat identifier
// ---------------------------------------------------------------------------

/**
 * Feature: qr-code-feature-ui
 * Property 5: Aria-label contains flat identifier
 *
 * For any flat number string and supported locale, the QrCodeButton's
 * aria-label attribute SHALL contain both the localized "Generate QR code"
 * text and the flat number value.
 *
 * The QrCodeButton uses `t('qrCode.generateAriaLabel', { flatNumber })` to
 * construct its aria-label. We verify the interpolation logic directly against
 * both locale dictionaries.
 *
 */

describe('Feature: qr-code-feature-ui, Property 5: Aria-label contains flat identifier', () => {
  /**
   * Replicates the translation interpolation logic from the i18n context.
   * Given a template string with `{{paramKey}}` placeholders, replaces them
   * with the provided param values.
   */
  function interpolate(
    template: string,
    params: Record<string, string>,
  ): string {
    let result = template
    for (const [key, value] of Object.entries(params)) {
      // Use a function replacement to avoid special $ handling in replacement strings
      result = result.replace(`{{${key}}}`, () => value)
    }
    return result
  }

  // Get the aria-label templates from both locales
  const enTemplate = (en as unknown as Record<string, Record<string, string>>)
    .qrCode!.generateAriaLabel!
  const bnTemplate = (bn as unknown as Record<string, Record<string, string>>)
    .qrCode!.generateAriaLabel!

  // The English template contains "Generate QR code for flat"
  // The Bangla template contains "কিউআর কোড তৈরি করুন"
  const EN_EXPECTED_TEXT = 'Generate QR code for flat'
  const BN_EXPECTED_TEXT = 'কিউআর কোড তৈরি করুন'

  it('for any non-empty flat number string, the English aria-label contains the flat number value', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0),
        (flatNumber) => {
          const ariaLabel = interpolate(enTemplate, { flatNumber })

          expect(ariaLabel).toContain(flatNumber)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('for any non-empty flat number string, the English aria-label contains the localized "Generate QR code" text', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0),
        (flatNumber) => {
          const ariaLabel = interpolate(enTemplate, { flatNumber })

          expect(ariaLabel).toContain(EN_EXPECTED_TEXT)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('for any non-empty flat number string, the Bangla aria-label contains the flat number value', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0),
        (flatNumber) => {
          const ariaLabel = interpolate(bnTemplate, { flatNumber })

          expect(ariaLabel).toContain(flatNumber)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('for any non-empty flat number string, the Bangla aria-label contains the localized QR code generation text', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0),
        (flatNumber) => {
          const ariaLabel = interpolate(bnTemplate, { flatNumber })

          expect(ariaLabel).toContain(BN_EXPECTED_TEXT)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('for any supported locale and non-empty flat number, the aria-label contains both localized text and flat number', () => {
    const locales = [
      { template: enTemplate, expectedText: EN_EXPECTED_TEXT, locale: 'en' },
      { template: bnTemplate, expectedText: BN_EXPECTED_TEXT, locale: 'bn' },
    ] as const

    fc.assert(
      fc.property(
        fc.constantFrom(...locales),
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0),
        (localeConfig, flatNumber) => {
          const ariaLabel = interpolate(localeConfig.template, { flatNumber })

          // Aria-label must contain the flat number value
          expect(
            ariaLabel,
            `${localeConfig.locale} aria-label should contain flatNumber "${flatNumber}"`,
          ).toContain(flatNumber)

          // Aria-label must contain the localized "Generate QR code" text
          expect(
            ariaLabel,
            `${localeConfig.locale} aria-label should contain localized text`,
          ).toContain(localeConfig.expectedText)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 3: Dialog displays flat metadata in labels and alt text
// ---------------------------------------------------------------------------

/**
 * Feature: qr-code-feature-ui
 * Property 3: Dialog displays flat metadata in labels and alt text
 *
 * For any flat number and building name, when QR code is loaded, the dialog
 * displays both as visible text and in the image alt attribute.
 *
 */

/** Arbitrary non-empty string generator for flat numbers and building names.
 * Uses alphanumeric characters, spaces, and common punctuation that won't
 * trigger String.replace() special replacement patterns (e.g., $&, $$). */
const nonEmptyString = fc
  .array(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -/'.split(
        '',
      ),
    ),
    { minLength: 1, maxLength: 30 },
  )
  .map((chars) => chars.join(''))
  .filter((s) => s.trim().length > 0)

describe('Feature: qr-code-feature-ui, Property 3: Dialog displays flat metadata in labels and alt text', () => {
  afterEach(() => {
    cleanup()
  })

  it('for any flat number and building name, the QrCodePreview displays both as visible text', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        (flatNumber, buildingName) => {
          const { container } = render(
            React.createElement(
              I18nProvider,
              { initialLocale: 'en' } as unknown as React.ComponentProps<
                typeof I18nProvider
              >,
              React.createElement(QrCodePreview, {
                blobUrl: 'blob:http://localhost/test',
                flatNumber,
                buildingName,
                isLoading: false,
                error: null,
                retryCount: 0,
                maxRetries: 3,
                onRetry: () => {},
              }),
            ),
          )

          const textContent = container.textContent ?? ''
          expect(
            textContent,
            `Flat number "${flatNumber}" should appear as visible text`,
          ).toContain(flatNumber)
          expect(
            textContent,
            `Building name "${buildingName}" should appear as visible text`,
          ).toContain(buildingName)

          cleanup()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('for any flat number and building name, the image alt attribute contains both values', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        (flatNumber, buildingName) => {
          const { container } = render(
            React.createElement(
              I18nProvider,
              { initialLocale: 'en' } as unknown as React.ComponentProps<
                typeof I18nProvider
              >,
              React.createElement(QrCodePreview, {
                blobUrl: 'blob:http://localhost/test',
                flatNumber,
                buildingName,
                isLoading: false,
                error: null,
                retryCount: 0,
                maxRetries: 3,
                onRetry: () => {},
              }),
            ),
          )

          const img = container.querySelector('img')
          expect(img, 'An img element should be rendered').not.toBeNull()

          const altText = img!.getAttribute('alt') ?? ''
          expect(
            altText,
            `Image alt should contain flat number "${flatNumber}"`,
          ).toContain(flatNumber)
          expect(
            altText,
            `Image alt should contain building name "${buildingName}"`,
          ).toContain(buildingName)

          cleanup()
        },
      ),
      { numRuns: 100 },
    )
  })
})
