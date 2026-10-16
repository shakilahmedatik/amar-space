import { z } from "zod";
import { bdPhoneSchema, emailSchema, uuidSchema } from "./common";

export const bookingStatusEnum = z.enum([
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
]);

export const bookingPaymentStatusEnum = z.enum(["unpaid", "partially_paid", "paid", "refunded"]);

export const createBookingSchema = z.object({
  roomTypeId: uuidSchema,
  roomId: uuidSchema.optional().nullable(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  guestName: z.string().min(2).max(100),
  guestEmail: emailSchema,
  guestPhone: bdPhoneSchema,
  guestNidOrPassport: z.string().max(50).optional().nullable(),
  specialRequests: z.string().max(1000).optional().nullable(),
  adultsCount: z.number().int().min(1).default(1),
  childrenCount: z.number().int().min(0).default(0),
});

export const updateBookingStatusSchema = z.object({
  status: bookingStatusEnum,
  cancellationReason: z.string().max(500).optional().nullable(),
});

export type BookingStatus = z.infer<typeof bookingStatusEnum>;
export type BookingPaymentStatus = z.infer<typeof bookingPaymentStatusEnum>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
