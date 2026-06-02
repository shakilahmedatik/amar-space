'use client'

import { ChevronDown, ChevronUp, Megaphone } from 'lucide-react'
import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { cn } from '@/lib/utils'

interface Notice {
  id: string
  title: string
  body: string
  createdAt: string // ISO 8601
  isPinned: boolean
}

interface NoticeBoardProps {
  notices: Notice[]
  flatSlug: string
  className?: string
}

/**
 * Bangla numerals mapping for date formatting.
 */
const BANGLA_DIGITS: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
}

/**
 * Bangla month names for date formatting.
 */
const BANGLA_MONTHS: string[] = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
]

const MAX_DESCRIPTION_LENGTH = 120

/**
 * Converts a string of Western Arabic numerals to Bangla numerals.
 */
function toBanglaNumerals(str: string): string {
  return str.replace(/[0-9]/g, (digit) => BANGLA_DIGITS[digit] || digit)
}

/**
 * Formats a date string (ISO 8601) to Bangla "DD MMM YYYY" format.
 * Uses Bangla numerals and Bangla month names.
 *
 * Example: "2024-03-15T10:00:00Z" → "১৫ মার্চ ২০২৪"
 */
export function formatBanglaDate(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const day = toBanglaNumerals(String(date.getDate()).padStart(2, '0'))
  const month = BANGLA_MONTHS[date.getMonth()]
  const year = toBanglaNumerals(String(date.getFullYear()))

  return `${day} ${month} ${year}`
}

/**
 * Truncates a string to the specified maximum length.
 * Appends "..." if truncated.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength)}...`
}

/**
 * Notice board component — displays building notices in reverse chronological order.
 *
 * Features:
 * - Notices sorted by most recent first
 * - Bangla date formatting (DD MMM YYYY with Bangla numerals)
 * - Description truncated to 120 chars with expand/collapse on tap
 * - Empty state message "কোনো নোটিশ নেই" when no notices
 * - Tracks "Notice Viewed" analytics event on expand
 */
export function NoticeBoard({
  notices,
  flatSlug,
  className,
}: NoticeBoardProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Sort notices in reverse chronological order (most recent first)
  const sortedNotices = [...notices]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 20)

  function handleToggle(noticeId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(noticeId)) {
        next.delete(noticeId)
      } else {
        next.add(noticeId)
        // Track "Notice Viewed" analytics event on expand
        trackEvent('Notice Viewed', flatSlug, { noticeId })
      }
      return next
    })
  }

  // Empty state
  if (sortedNotices.length === 0) {
    return (
      <section
        id="notice-board"
        aria-label="নোটিশ বোর্ড"
        className={cn('flex flex-col gap-3', className)}
      >
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-brand-blue-deep" aria-hidden />
          <h2 className="text-base font-bold text-ink">নোটিশ বোর্ড</h2>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-hairline bg-surface p-8 text-center">
          <Megaphone className="h-10 w-10 text-steel" aria-hidden />
          <p className="text-sm text-steel">কোনো নোটিশ নেই</p>
        </div>
      </section>
    )
  }

  return (
    <section
      id="notice-board"
      aria-label="নোটিশ বোর্ড"
      className={cn('flex flex-col gap-3', className)}
    >
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-brand-blue-deep" aria-hidden />
        <h2 className="text-base font-bold text-ink">নোটিশ বোর্ড</h2>
      </div>

      <div className="flex flex-col gap-2">
        {sortedNotices.map((notice) => {
          const isExpanded = expandedIds.has(notice.id)
          const needsTruncation = notice.body.length > MAX_DESCRIPTION_LENGTH

          return (
            <button
              key={notice.id}
              type="button"
              onClick={() => handleToggle(notice.id)}
              className={cn(
                'w-full rounded-xl border p-4 text-left transition-all hover:shadow-sm active:scale-[0.99]',
                notice.isPinned
                  ? 'border-brand-blue-deep/30 bg-brand-blue-200/20'
                  : 'border-hairline bg-white',
              )}
              aria-expanded={isExpanded}
              aria-label={`নোটিশ: ${notice.title}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {notice.isPinned && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue-deep bg-brand-blue-200/50 px-2 py-0.5 rounded-full mb-1.5">
                      📌 পিন করা
                    </span>
                  )}
                  <h3 className="text-sm font-semibold text-ink">
                    {notice.title}
                  </h3>
                  <time
                    dateTime={notice.createdAt}
                    className="mt-0.5 block text-xs text-steel"
                  >
                    {formatBanglaDate(notice.createdAt)}
                  </time>
                </div>
                {needsTruncation && (
                  <span className="shrink-0 text-steel" aria-hidden>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm leading-relaxed text-ink/80">
                {isExpanded || !needsTruncation
                  ? notice.body
                  : truncateText(notice.body, MAX_DESCRIPTION_LENGTH)}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
