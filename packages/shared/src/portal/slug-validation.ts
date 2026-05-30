/**
 * Flat slug validation utility for the Renter QR Portal.
 *
 * A valid flat slug consists exclusively of lowercase alphanumeric characters
 * (a-z, 0-9) and hyphens, with a length between 1 and 100 characters inclusive.
 *
 * @module portal/slug-validation
 */

/**
 * Regex pattern for valid flat slugs.
 * Matches strings containing only lowercase letters, digits, and hyphens,
 * with a length of 1 to 100 characters.
 */
export const FLAT_SLUG_PATTERN = /^[a-z0-9-]{1,100}$/

/**
 * Validates whether a given string is a valid flat slug.
 *
 * A valid slug:
 * - Contains only lowercase alphanumeric characters (a-z, 0-9) and hyphens
 * - Has a length between 1 and 100 characters inclusive
 *
 * Invalid slugs should be rejected without triggering a database lookup.
 *
 * @param slug - The string to validate
 * @returns `true` if the slug is valid, `false` otherwise
 */
export function isValidFlatSlug(slug: string): boolean {
  return FLAT_SLUG_PATTERN.test(slug)
}
