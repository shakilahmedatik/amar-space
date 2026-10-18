import { z } from "zod";
import { bdPhoneSchema, emailSchema } from "./common";

// Enums
export const roomStatusEnum = z.enum([
  "available",
  "occupied",
  "reserved",
  "cleaning",
  "maintenance",
]);
export type RoomStatus = z.infer<typeof roomStatusEnum>;

export const bedTypeEnum = z.enum(["single", "double", "queen", "king", "twin"]);
export type BedType = z.infer<typeof bedTypeEnum>;

export const bookingStatusEnum = z.enum([
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
]);
export type BookingStatus = z.infer<typeof bookingStatusEnum>;

export const bookingPaymentStatusEnum = z.enum(["unpaid", "partially_paid", "paid", "refunded"]);
export type BookingPaymentStatus = z.infer<typeof bookingPaymentStatusEnum>;

// Room Type Schemas
export const createRoomTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(2000).optional().nullable(),
  basePrice: z.coerce.number().min(0, "Base price must be non-negative"),
  capacityAdults: z.coerce.number().int().min(1).max(20).default(2),
  capacityChildren: z.coerce.number().int().min(0).max(10).default(0),
  amenities: z.array(z.string().max(50)).default([]),
  photos: z.array(z.string().url("Must be valid URL")).default([]),
  bedType: bedTypeEnum.default("queen"),
  bedCount: z.coerce.number().int().min(1).max(10).default(1),
  sizeSqFt: z.coerce.number().positive().optional().nullable(),
});
export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;

export const updateRoomTypeSchema = createRoomTypeSchema.partial();
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>;

// Room Schemas
export const createRoomSchema = z.object({
  roomTypeId: z.string().min(1, "Room type is required"),
  roomNumber: z.string().min(1, "Room number is required").max(20),
  floor: z.coerce.number().int().min(0).max(200).default(1),
  status: roomStatusEnum.default("available"),
  housekeepingNotes: z.string().max(500).optional().nullable(),
});
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = z.object({
  roomTypeId: z.string().min(1).optional(),
  roomNumber: z.string().min(1).max(20).optional(),
  floor: z.coerce.number().int().min(0).max(200).optional(),
  status: roomStatusEnum.optional(),
  housekeepingNotes: z.string().max(500).optional().nullable(),
});
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

export const updateRoomStatusSchema = z.object({
  roomId: z.string().min(1),
  status: z.enum(["available", "cleaning", "maintenance"]),
  housekeepingNotes: z.string().max(500).optional().nullable(),
});
export type UpdateRoomStatusInput = z.infer<typeof updateRoomStatusSchema>;

// Booking Schemas
export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createBookingSchema = z
  .object({
    roomTypeId: z.string().min(1, "Room type is required"),
    roomId: z.string().min(1).optional().nullable(),
    checkInDate: z.string().regex(dateRegex, "Format: YYYY-MM-DD"),
    checkOutDate: z.string().regex(dateRegex, "Format: YYYY-MM-DD"),
    guestName: z.string().min(2, "Guest name must be at least 2 characters").max(100),
    guestEmail: emailSchema,
    guestPhone: bdPhoneSchema,
    guestNidOrPassport: z.string().max(50).optional().nullable(),
    specialRequests: z.string().max(1000).optional().nullable(),
    adultsCount: z.coerce.number().int().min(1).default(1),
    childrenCount: z.coerce.number().int().min(0).default(0),
    totalPrice: z.coerce.number().min(0).optional(),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    message: "Check-out date must be strictly after check-in date",
    path: ["checkOutDate"],
  });
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const checkInSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  roomId: z.string().min(1, "Room assignment is required"),
  guestNidOrPassport: z
    .string()
    .min(5, "Valid NID or Passport number is mandatory for check-in")
    .max(50),
  specialRequests: z.string().max(1000).optional().nullable(),
});
export type CheckInInput = z.infer<typeof checkInSchema>;

export const checkOutSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  settleExtraCharges: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["cash", "bkash", "nagad", "card", "bank_transfer"]).default("cash"),
  notes: z.string().max(1000).optional().nullable(),
});
export type CheckOutInput = z.infer<typeof checkOutSchema>;

export const cancelBookingSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  cancellationReason: z.string().min(3, "Cancellation reason is required").max(500),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const addExtraChargeSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  description: z.string().min(2, "Description is required").max(200),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
});
export type AddExtraChargeInput = z.infer<typeof addExtraChargeSchema>;

export const listBookingsSchema = z.object({
  status: bookingStatusEnum.optional(),
  roomTypeId: z.string().optional(),
  roomId: z.string().optional(),
  startDate: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional(),
  endDate: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type ListBookingsInput = z.infer<typeof listBookingsSchema>;

// Public Guest Booking Schemas (Direct Web Engine)
export const searchAvailabilitySchema = z
  .object({
    organizationId: z.string().min(1, "Organization is required"),
    checkInDate: z.string().regex(dateRegex, "Format: YYYY-MM-DD"),
    checkOutDate: z.string().regex(dateRegex, "Format: YYYY-MM-DD"),
    adultsCount: z.coerce.number().int().min(1).default(1),
    childrenCount: z.coerce.number().int().min(0).default(0),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    message: "Check-out date must be strictly after check-in date",
    path: ["checkOutDate"],
  });
export type SearchAvailabilityInput = z.infer<typeof searchAvailabilitySchema>;

export const publicCreateBookingSchema = z
  .object({
    organizationId: z.string().min(1, "Organization is required"),
    roomTypeId: z.string().min(1, "Room type is required"),
    checkInDate: z.string().regex(dateRegex, "Format: YYYY-MM-DD"),
    checkOutDate: z.string().regex(dateRegex, "Format: YYYY-MM-DD"),
    guestName: z.string().min(2, "Guest name is required").max(100),
    guestEmail: emailSchema,
    guestPhone: bdPhoneSchema,
    adultsCount: z.coerce.number().int().min(1).default(1),
    childrenCount: z.coerce.number().int().min(0).default(0),
    specialRequests: z.string().max(1000).optional().nullable(),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    message: "Check-out date must be strictly after check-in date",
    path: ["checkOutDate"],
  });
export type PublicCreateBookingInput = z.infer<typeof publicCreateBookingSchema>;

// Overlap Calculation Utility
export function checkDateOverlap(
  checkIn1: string,
  checkOut1: string,
  checkIn2: string,
  checkOut2: string,
): boolean {
  return checkIn1 < checkOut2 && checkOut1 > checkIn2;
}

// Domain Error Codes
export const HOTEL_ERROR_CODES = {
  ROOM_NOT_AVAILABLE: "ROOM_NOT_AVAILABLE",
  ROOM_DIRTY_OR_MAINTENANCE: "ROOM_DIRTY_OR_MAINTENANCE",
  CHECKIN_BEFORE_DATE: "CHECKIN_BEFORE_DATE",
  OVERLAPPING_DATES: "OVERLAPPING_DATES",
  BOOKING_NOT_FOUND: "BOOKING_NOT_FOUND",
  INVALID_ROOM_STATUS: "INVALID_ROOM_STATUS",
  ROOM_TYPE_NOT_FOUND: "ROOM_TYPE_NOT_FOUND",
} as const;
