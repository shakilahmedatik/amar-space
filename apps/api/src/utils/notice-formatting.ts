/**
 * Notice formatting utilities for the Renter QR Portal.
 *
 * Extracts the notice list formatting logic from the portal API route
 * into a testable pure function.
 *
 * Requirements: 4.1, 4.2
 */

export interface RawNotice {
  id: string
  title: string
  body: string
  createdAt: Date
  isPinned: boolean
}

export interface FormattedNotice {
  id: string
  title: string
  body: string
  createdAt: string
  isPinned: boolean
}

const MAX_BODY_LENGTH = 120
const MAX_NOTICES = 20

/**
 * Formats a list of notices for the portal response:
 * 1. Sorts notices by createdAt in descending order (most recent first)
 * 2. Limits the result to at most 20 notices
 * 3. Truncates each notice body to 120 characters (with ellipsis if truncated)
 */
export function formatNoticesForPortal(
  rawNotices: RawNotice[],
): FormattedNotice[] {
  // Sort by createdAt descending (most recent first)
  const sorted = [...rawNotices].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )

  // Limit to MAX_NOTICES
  const limited = sorted.slice(0, MAX_NOTICES)

  // Truncate body and format
  return limited.map((notice) => ({
    id: notice.id,
    title: notice.title,
    body:
      notice.body.length > MAX_BODY_LENGTH
        ? `${notice.body.slice(0, MAX_BODY_LENGTH)}…`
        : notice.body,
    createdAt: notice.createdAt.toISOString(),
    isPinned: notice.isPinned,
  }))
}
