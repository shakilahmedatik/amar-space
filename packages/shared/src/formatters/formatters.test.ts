import { describe, expect, it } from 'vitest'
import { formatBDT, formatDate, parseDate } from './index'

describe('formatBDT', () => {
  it('formats zero correctly', () => {
    expect(formatBDT(0)).toBe('৳0.00')
  })

  it('formats small amounts without grouping', () => {
    expect(formatBDT(5)).toBe('৳5.00')
    expect(formatBDT(99.5)).toBe('৳99.50')
    expect(formatBDT(999)).toBe('৳999.00')
  })

  it('formats amounts with Bangladeshi grouping (last 3, then pairs)', () => {
    expect(formatBDT(1234)).toBe('৳1,234.00')
    expect(formatBDT(12345)).toBe('৳12,345.00')
    expect(formatBDT(123456)).toBe('৳1,23,456.00')
    expect(formatBDT(1234567)).toBe('৳12,34,567.00')
    expect(formatBDT(12345678)).toBe('৳1,23,45,678.00')
    expect(formatBDT(120000)).toBe('৳1,20,000.00')
  })

  it('formats decimal amounts correctly', () => {
    expect(formatBDT(123456.78)).toBe('৳1,23,456.78')
    expect(formatBDT(0.5)).toBe('৳0.50')
    expect(formatBDT(1000.01)).toBe('৳1,000.01')
  })

  it('formats negative amounts', () => {
    expect(formatBDT(-5000)).toBe('-৳5,000.00')
    expect(formatBDT(-123456.78)).toBe('-৳1,23,456.78')
  })

  it('handles non-finite values gracefully', () => {
    expect(formatBDT(Number.NaN)).toBe('৳0.00')
    expect(formatBDT(Number.POSITIVE_INFINITY)).toBe('৳0.00')
    expect(formatBDT(Number.NEGATIVE_INFINITY)).toBe('৳0.00')
  })
})

describe('formatDate', () => {
  it('formats a date as DD/MM/YYYY', () => {
    const date = new Date(2024, 0, 15) // Jan 15, 2024
    expect(formatDate(date)).toBe('15/01/2024')
  })

  it('pads single-digit day and month', () => {
    const date = new Date(2024, 2, 5) // Mar 5, 2024
    expect(formatDate(date)).toBe('05/03/2024')
  })

  it('handles end of year', () => {
    const date = new Date(2024, 11, 31) // Dec 31, 2024
    expect(formatDate(date)).toBe('31/12/2024')
  })

  it('returns empty string for invalid date', () => {
    expect(formatDate(new Date('invalid'))).toBe('')
  })
})

describe('parseDate', () => {
  it('parses a valid DD/MM/YYYY string', () => {
    const result = parseDate('15/01/2024')
    expect(result).not.toBeNull()
    expect(result!.getDate()).toBe(15)
    expect(result!.getMonth()).toBe(0)
    expect(result!.getFullYear()).toBe(2024)
  })

  it('returns null for invalid format', () => {
    expect(parseDate('2024-01-15')).toBeNull()
    expect(parseDate('1/1/2024')).toBeNull()
    expect(parseDate('abc')).toBeNull()
  })

  it('returns null for invalid dates', () => {
    expect(parseDate('31/02/2024')).toBeNull() // Feb 31 doesn't exist
    expect(parseDate('32/01/2024')).toBeNull() // Day 32 doesn't exist
  })
})
