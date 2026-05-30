import { describe, expect, it } from 'vitest'
import { generateTemporaryPassword } from '../../src/utils/password-generator.js'

describe('generateTemporaryPassword', () => {
  it('generates a password of default length 16', () => {
    const password = generateTemporaryPassword()
    expect(password).toHaveLength(16)
  })

  it('generates a password of specified length', () => {
    const password = generateTemporaryPassword(20)
    expect(password).toHaveLength(20)
  })

  it('enforces minimum length of 12 characters', () => {
    const password = generateTemporaryPassword(8)
    expect(password.length).toBeGreaterThanOrEqual(12)
  })

  it('contains at least one uppercase letter', () => {
    const password = generateTemporaryPassword()
    expect(password).toMatch(/[A-Z]/)
  })

  it('contains at least one lowercase letter', () => {
    const password = generateTemporaryPassword()
    expect(password).toMatch(/[a-z]/)
  })

  it('contains at least one digit', () => {
    const password = generateTemporaryPassword()
    expect(password).toMatch(/[0-9]/)
  })

  it('contains at least one special character', () => {
    const password = generateTemporaryPassword()
    expect(password).toMatch(/[!@#$%^&*]/)
  })

  it('generates unique passwords on successive calls', () => {
    const passwords = new Set(
      Array.from({ length: 10 }, () => generateTemporaryPassword()),
    )
    // With 16-char passwords from a large pool, collisions are astronomically unlikely
    expect(passwords.size).toBe(10)
  })

  it('only contains characters from the allowed pool', () => {
    const allowedChars = /^[A-Za-z0-9!@#$%^&*]+$/
    for (let i = 0; i < 20; i++) {
      const password = generateTemporaryPassword()
      expect(password).toMatch(allowedChars)
    }
  })
})
