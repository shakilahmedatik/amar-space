import { z } from "zod";
import { bdPhoneSchema, nidSchema, paginationSchema } from "./common";

export const bookingStatusEnum = z.enum([
  "reserved",
  "confirmed",
  "checked_in",
  "checked_out",
  "canceled",
  "no_show",
]);
export type BookingStatus = z.infer<typeof bookingStatusEnum>;

export const bookingFilterSchema = paginationSchema.extend({
  roomId: z.string().optional(),
  roomTypeId: z.string().optional(),
  status: bookingStatusEnum.optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  search: z.string().optional(),
});
export type BookingFilterInput = z.infer<typeof bookingFilterSchema>;

export const hotelBookingSchema = z
  .object({
    roomId: z.string().min(1, "Room is required"),
    guestName: z.string().min(2, "Guest name must be at least 2 characters").max(100),
    guestPhone: bdPhoneSchema,
    guestEmail: z.string().email().optional(),
    guestNid: nidSchema.optional(),
    checkInDate: z.string().date(),
    checkOutDate: z.string().date(),
    adultsCount: z.number().int().min(1).default(1),
    childrenCount: z.number().int().min(0).default(0),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => new Date(data.checkOutDate) > new Date(data.checkInDate), {
    message: "checkOutDate must be after checkInDate",
    path: ["checkOutDate"],
  });
export type HotelBookingInput = z.infer<typeof hotelBookingSchema>;

// Re-export hotel module validators for seamless ergonomics
export * from "./hotel";
