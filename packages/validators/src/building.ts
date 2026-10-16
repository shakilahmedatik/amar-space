import { z } from "zod";
import { uuidSchema } from "./common";

export const emergencyContactInputSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(50),
  phone: z.string().max(20).optional().nullable(),
  type: z.enum(["building", "nearby"]),
});

export const createBuildingSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  totalFloors: z.number().int().min(1).max(200).optional(),
  whatsappGroupLink: z.string().max(500).optional().nullable(),
  managerPhone: z.string().max(20).optional().nullable(),
  buildingPhoto: z.string().optional().nullable(),
  logoPhoto: z.string().optional().nullable(),
  rules: z.string().max(5000).optional().nullable(),
  emergencyContacts: z.array(emergencyContactInputSchema).optional(),
});

export const updateBuildingSchema = createBuildingSchema.partial();

export const flatStatusEnum = z.enum(["vacant", "occupied", "under_maintenance"]);

export const createFlatSchema = z.object({
  buildingId: uuidSchema,
  flatNumber: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-zA-Z0-9\-_]+$/, "Flat number must be alphanumeric"),
  floor: z.number().int().min(0).max(200),
});

export const updateFlatSchema = z.object({
  flatNumber: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-zA-Z0-9\-_]+$/, "Flat number must be alphanumeric")
    .optional(),
  floor: z.number().int().min(0).max(200).optional(),
  status: flatStatusEnum.optional(),
});

export const priorityEnum = z.enum(["low", "medium", "high", "urgent"]);
export const maintenanceStatusEnum = z.enum(["open", "in_progress", "resolved", "closed"]);

export const createMaintenanceRequestSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  priority: priorityEnum,
  buildingId: uuidSchema.optional(),
  flatId: uuidSchema.optional().nullable(),
});

export const noticeTargetEnum = z.enum([
  "all_renters",
  "specific_building",
  "specific_flat",
  "managers_only",
]);

export const createNoticeSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  targetAudience: noticeTargetEnum,
  targetBuildingId: uuidSchema.optional().nullable(),
  targetFlatId: uuidSchema.optional().nullable(),
  isPinned: z.boolean().default(false),
  expiresAt: z.string().optional().nullable(),
});

export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type UpdateBuildingInput = z.infer<typeof updateBuildingSchema>;
export type CreateFlatInput = z.infer<typeof createFlatSchema>;
export type UpdateFlatInput = z.infer<typeof updateFlatSchema>;
export type CreateMaintenanceRequestInput = z.infer<typeof createMaintenanceRequestSchema>;
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;
