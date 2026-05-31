import { z } from 'zod'

/**
 * Shared schema for datetime fields in response objects.
 * Accepts both ISO string (from manual construction) and Date objects (from Drizzle ORM).
 * Outputs ISO 8601 string in both cases.
 */
export const dateTimeResponseSchema = z
  .string()
  .or(z.date().transform((d) => d.toISOString()))

/**
 * Shared OpenAPI error response schema.
 * Used across all route files to document 400/401/403/404/429/500 responses.
 */
export const errorResponseSchema = z.object({
  requestId: z.string(),
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
  errors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
})
