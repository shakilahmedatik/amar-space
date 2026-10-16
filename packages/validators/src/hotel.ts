import { z } from "zod";
import { uuidSchema } from "./common";

export const roomStatusEnum = z.enum([
  "available",
  "occupied",
  "reserved",
  "cleaning",
  "maintenance",
]);

export const bedTypeEnum = z.enum(["single", "double", "queen", "king", "twin"]);

export const createRoomTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional().nullable(),
  basePrice: z.number().min(0),
  capacityAdults: z.number().int().min(1).max(20).default(2),
  capacityChildren: z.number().int().min(0).max(10).default(0),
  amenities: z.array(z.string().max(50)).default([]),
  photos: z.array(z.string().url()).default([]),
  bedType: bedTypeEnum.default("queen"),
  bedCount: z.number().int().min(1).max(10).default(1),
  sizeSqFt: z.number().positive().optional().nullable(),
});

export const updateRoomTypeSchema = createRoomTypeSchema.partial();

export const createRoomSchema = z.object({
  roomTypeId: uuidSchema,
  roomNumber: z.string().min(1).max(20),
  floor: z.number().int().min(0).max(200),
  status: roomStatusEnum.default("available"),
});

export const updateRoomSchema = z.object({
  roomTypeId: uuidSchema.optional(),
  roomNumber: z.string().min(1).max(20).optional(),
  floor: z.number().int().min(0).max(200).optional(),
  status: roomStatusEnum.optional(),
});

export type RoomStatus = z.infer<typeof roomStatusEnum>;
export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
