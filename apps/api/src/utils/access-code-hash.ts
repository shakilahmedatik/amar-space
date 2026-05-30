import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Hashes a 6-digit access code using SHA-256.
 *
 * The hash format is: sha256(code)
 * Since access codes are only 6 digits (limited keyspace), in production
 * you'd want to use bcrypt/argon2 with a salt. For this implementation,
 * we use SHA-256 which matches the stored `code_hash` format.
 *
 * @param code - The 6-digit numeric access code
 * @returns The hex-encoded SHA-256 hash
 */
export function hashAccessCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/**
 * Compares a plaintext access code against a stored hash using
 * timing-safe comparison to prevent timing attacks.
 *
 * @param code - The plaintext 6-digit access code to verify
 * @param storedHash - The stored hash to compare against
 * @returns `true` if the code matches the hash, `false` otherwise
 */
export async function compareAccessCode(
  code: string,
  storedHash: string,
): Promise<boolean> {
  const codeHash = hashAccessCode(code)

  // Use timing-safe comparison to prevent timing attacks
  try {
    const hashBuffer = Buffer.from(codeHash, 'hex')
    const storedBuffer = Buffer.from(storedHash, 'hex')

    if (hashBuffer.length !== storedBuffer.length) {
      return false
    }

    return timingSafeEqual(hashBuffer, storedBuffer)
  } catch {
    return false
  }
}
