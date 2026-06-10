import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LEN = 64
const SALT_LEN = 16

/**
 * Hashes a 6-digit access code using scrypt with a random salt.
 *
 * The hash format is: salt:hash
 *
 * @param code - The 6-digit numeric access code
 * @returns The salt and hex-encoded scrypt hash joined by a colon
 */
export function hashAccessCode(code: string): string {
  const salt = randomBytes(SALT_LEN).toString('hex')
  const derivedKey = scryptSync(code, salt, KEY_LEN)
  return `${salt}:${derivedKey.toString('hex')}`
}

/**
 * Compares a plaintext access code against a stored hash using
 * timing-safe comparison to prevent timing attacks.
 *
 * @param code - The plaintext 6-digit access code to verify
 * @param storedHash - The stored salt:hash format to compare against
 * @returns `true` if the code matches the hash, `false` otherwise
 */
export async function compareAccessCode(
  code: string,
  storedHash: string,
): Promise<boolean> {
  try {
    const parts = storedHash.split(':')
    if (parts.length !== 2) {
      return false
    }
    const [salt, hash] = parts
    if (!salt || !hash) {
      return false
    }

    const codeHashBuffer = scryptSync(code, salt, KEY_LEN)
    const storedHashBuffer = Buffer.from(hash, 'hex')

    if (codeHashBuffer.length !== storedHashBuffer.length) {
      return false
    }

    return timingSafeEqual(codeHashBuffer, storedHashBuffer)
  } catch {
    return false
  }
}
