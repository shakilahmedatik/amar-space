import { describe, expect, it } from 'vitest'
import {
  compareAccessCode,
  hashAccessCode,
} from '../../src/utils/access-code-hash'

describe('access-code-hash utility', () => {
  describe('hashAccessCode', () => {
    it('should produce a consistent hash for the same code', () => {
      const hash1 = hashAccessCode('123456')
      const hash2 = hashAccessCode('123456')
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different codes', () => {
      const hash1 = hashAccessCode('123456')
      const hash2 = hashAccessCode('654321')
      expect(hash1).not.toBe(hash2)
    })

    it('should return a 64-character hex string (SHA-256)', () => {
      const hash = hashAccessCode('000000')
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  describe('compareAccessCode', () => {
    it('should return true for matching code and hash', async () => {
      const code = '123456'
      const hash = hashAccessCode(code)
      const result = await compareAccessCode(code, hash)
      expect(result).toBe(true)
    })

    it('should return false for non-matching code', async () => {
      const hash = hashAccessCode('123456')
      const result = await compareAccessCode('654321', hash)
      expect(result).toBe(false)
    })

    it('should return false for invalid stored hash format', async () => {
      const result = await compareAccessCode('123456', 'not-a-valid-hex')
      expect(result).toBe(false)
    })

    it('should return false for empty stored hash', async () => {
      const result = await compareAccessCode('123456', '')
      expect(result).toBe(false)
    })
  })
})
