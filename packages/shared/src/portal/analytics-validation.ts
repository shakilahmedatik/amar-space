import { z } from 'zod'

// ─── Analytics Event Validation ─────────────────────────────────────────────

/**
 * Zod schema for validating analytics event payloads sent from the portal.
 * Ensures `flatSlug` is non-empty and `timestamp` is a valid ISO 8601 string.
 *
 * @see Requirements 13.2
 */
export const analyticsEventSchema = z.object({
  event: z.string().min(1),
  flatSlug: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }),
  userAgent: z.string(),
  metadata: z.record(z.string(), z.string()).optional(),
})

// ─── Type Exports ───────────────────────────────────────────────────────────

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>
