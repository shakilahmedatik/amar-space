/**
 * Formats a building name for display in the portal header.
 * If the name exceeds 100 characters, it is truncated and an ellipsis is appended.
 *
 * @param name - The building name string to format
 * @returns The formatted building name (unchanged if ≤100 chars, truncated with "…" if >100 chars)
 */
export function formatBuildingName(name: string): string {
  if (name.length > 100) {
    return `${name.slice(0, 100)}\u2026`
  }
  return name
}
