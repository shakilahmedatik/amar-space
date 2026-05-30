import { describe, expect, it } from 'vitest'
import { analyticsEventSchema } from './analytics-validation'

describe('analyticsEventSchema', () => {
  it('accepts a valid analytics event', () => {
    const result = analyticsEventSchema.safeParse({
      event: 'QR Scanned',
      flatSlug: 'building-a-flat-4a',
      timestamp: '2024-01-15T10:30:00.000Z',
      userAgent: 'Mozilla/5.0',
      metadata: { source: 'qr' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty flatSlug', () => {
    const result = analyticsEventSchema.safeParse({
      event: 'QR Scanned',
      flatSlug: '',
      timestamp: '2024-01-15T10:30:00.000Z',
      userAgent: 'Mozilla/5.0',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid timestamp', () => {
    const result = analyticsEventSchema.safeParse({
      event: 'QR Scanned',
      flatSlug: 'building-a-flat-4a',
      timestamp: 'not-a-date',
      userAgent: 'Mozilla/5.0',
    })
    expect(result.success).toBe(false)
  })

  it('accepts timestamp with timezone offset', () => {
    const result = analyticsEventSchema.safeParse({
      event: 'QR Scanned',
      flatSlug: 'building-a-flat-4a',
      timestamp: '2024-01-15T10:30:00+06:00',
      userAgent: 'Mozilla/5.0',
    })
    expect(result.success).toBe(true)
  })

  it('accepts event without optional metadata', () => {
    const result = analyticsEventSchema.safeParse({
      event: 'QR Scanned',
      flatSlug: 'building-a-flat-4a',
      timestamp: '2024-01-15T10:30:00.000Z',
      userAgent: 'Mozilla/5.0',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing flatSlug field', () => {
    const result = analyticsEventSchema.safeParse({
      event: 'QR Scanned',
      timestamp: '2024-01-15T10:30:00.000Z',
      userAgent: 'Mozilla/5.0',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing timestamp field', () => {
    const result = analyticsEventSchema.safeParse({
      event: 'QR Scanned',
      flatSlug: 'building-a-flat-4a',
      userAgent: 'Mozilla/5.0',
    })
    expect(result.success).toBe(false)
  })
})
