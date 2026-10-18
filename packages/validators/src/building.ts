import { z } from "zod";
import { uuidSchema } from "./common";

export const BD_PHONE_REGEX = /^(?:\+8801|01)[3-9]\d{8}$/;

export const PROPERTY_ERROR_CODES = {
  BUILDING_NOT_FOUND: "BUILDING_NOT_FOUND",
  BUILDING_HAS_ACTIVE_UNITS: "BUILDING_HAS_ACTIVE_UNITS",
  FLAT_NOT_FOUND: "FLAT_NOT_FOUND",
  FLAT_DUPLICATE_NUMBER: "FLAT_DUPLICATE_NUMBER",
  FLAT_OCCUPIED_STATUS_LOCKED: "FLAT_OCCUPIED_STATUS_LOCKED",
  UNAUTHORIZED_PROPERTY_ACCESS: "UNAUTHORIZED_PROPERTY_ACCESS",
  INVALID_FLOOR_RANGE: "INVALID_FLOOR_RANGE",
} as const;

export type PropertyErrorCode = keyof typeof PROPERTY_ERROR_CODES;

export const buildingPhoneSchema = z
  .string()
  .transform((val) => val.replace(/[\s\-()]/g, ""))
  .pipe(
    z.string().regex(BD_PHONE_REGEX, {
      message:
        "Phone number must be a valid Bangladeshi format (e.g., 01712345678 or +8801712345678)",
    }),
  );

export const emergencyContactInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  role: z.string().min(1, "Role is required").max(50),
  phone: buildingPhoneSchema.optional().nullable(),
  type: z.enum(["building", "nearby"]).default("building"),
});

export const createBuildingSchema = z.object({
  name: z.string().min(2, "Building name must be at least 2 characters").max(200),
  address: z.string().min(3, "Address must be at least 3 characters").max(500),
  city: z.string().min(2).max(100).default("Dhaka"),
  thana: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  totalFloors: z.number().int().min(1).max(200).optional().nullable(),
  hasElevator: z.boolean().default(false),
  hasGenerator: z.boolean().default(false),
  gateClosingTime: z.string().max(20).optional().nullable(),
  caretakerPhone: buildingPhoneSchema.optional().nullable(),
  managerPhone: buildingPhoneSchema.optional().nullable(),
  whatsappGroupLink: z.string().max(500).optional().nullable(),
  buildingPhoto: z.string().url("Must be a valid URL").optional().nullable(),
  logoPhoto: z.string().url("Must be a valid URL").optional().nullable(),
  rules: z.string().max(5000).optional().nullable(),
  emergencyContacts: z.array(emergencyContactInputSchema).optional(),
});

export const updateBuildingSchema = z.object({
  id: z.string().min(1, "Building ID is required"),
  name: z.string().min(2).max(200).optional(),
  address: z.string().min(3).max(500).optional(),
  city: z.string().min(2).max(100).optional(),
  thana: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  totalFloors: z.number().int().min(1).max(200).optional().nullable(),
  hasElevator: z.boolean().optional(),
  hasGenerator: z.boolean().optional(),
  gateClosingTime: z.string().max(20).optional().nullable(),
  caretakerPhone: buildingPhoneSchema.optional().nullable(),
  managerPhone: buildingPhoneSchema.optional().nullable(),
  whatsappGroupLink: z.string().max(500).optional().nullable(),
  buildingPhoto: z.string().url().optional().nullable(),
  logoPhoto: z.string().url().optional().nullable(),
  rules: z.string().max(5000).optional().nullable(),
});

export const flatUnitTypeEnum = z.enum(["residential", "commercial", "studio", "duplex"]);
export const flatStatusEnum = z.enum(["vacant", "occupied", "under_maintenance"]);
export const electricityMeterTypeEnum = z.enum(["prepaid", "postpaid"]);
export const gasTypeEnum = z.enum(["pipeline", "cylinder", "none"]);

export const createFlatSchema = z.object({
  buildingId: z.string().min(1, "Building ID is required"),
  flatNumber: z
    .string()
    .min(1, "Flat code is required")
    .max(20)
    .regex(/^[a-zA-Z0-9\-_]+$/, "Flat code must be alphanumeric (e.g. 4A, 302, B-1)"),
  floor: z.number().int().min(0, "Floor must be 0 (Ground) or above").max(200),
  unitType: flatUnitTypeEnum.default("residential"),
  bedrooms: z.number().int().min(0).max(20).default(3),
  bathrooms: z.number().int().min(0).max(10).default(2),
  balconies: z.number().int().min(0).max(10).default(1),
  squareFeet: z.number().int().min(0).max(50000).optional().nullable(),
  defaultRentAmount: z.number().min(0, "Rent amount cannot be negative").default(0),
  defaultServiceCharge: z.number().min(0, "Service charge cannot be negative").default(0),
  electricityMeterNumber: z.string().max(50).optional().nullable(),
  electricityMeterType: electricityMeterTypeEnum.default("prepaid"),
  gasType: gasTypeEnum.default("cylinder"),
  waterSubmeterNumber: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: flatStatusEnum.default("vacant"),
});

export const bulkCreateFlatsSchema = z
  .object({
    buildingId: z.string().min(1, "Building ID is required"),
    floorStart: z.number().int().min(0, "Start floor must be 0 or above").max(100),
    floorEnd: z.number().int().min(0, "End floor must be 0 or above").max(100),
    letters: z
      .array(
        z
          .string()
          .min(1)
          .max(4)
          .regex(/^[a-zA-Z0-9]+$/, "Unit suffix must be alphanumeric (e.g. A, B, 1, 2)"),
      )
      .min(1, "At least one unit letter/suffix is required")
      .max(20),
    unitType: flatUnitTypeEnum.default("residential"),
    bedrooms: z.number().int().min(0).default(3),
    bathrooms: z.number().int().min(0).default(2),
    balconies: z.number().int().min(0).default(1),
    squareFeet: z.number().int().min(0).optional().nullable(),
    defaultRentAmount: z.number().min(0, "Rent amount cannot be negative").default(0),
    defaultServiceCharge: z.number().min(0, "Service charge cannot be negative").default(0),
    electricityMeterType: electricityMeterTypeEnum.default("prepaid"),
    gasType: gasTypeEnum.default("cylinder"),
  })
  .refine((data) => data.floorEnd >= data.floorStart, {
    message: "Floor end must be greater than or equal to floor start",
    path: ["floorEnd"],
  });

export const updateFlatSchema = z.object({
  id: z.string().min(1, "Flat ID is required"),
  flatNumber: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-zA-Z0-9\-_]+$/, "Flat code must be alphanumeric")
    .optional(),
  floor: z.number().int().min(0).max(200).optional(),
  unitType: flatUnitTypeEnum.optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(10).optional(),
  balconies: z.number().int().min(0).max(10).optional(),
  squareFeet: z.number().int().min(0).max(50000).optional().nullable(),
  defaultRentAmount: z.number().min(0).optional(),
  defaultServiceCharge: z.number().min(0).optional(),
  electricityMeterNumber: z.string().max(50).optional().nullable(),
  electricityMeterType: electricityMeterTypeEnum.optional(),
  gasType: gasTypeEnum.optional(),
  waterSubmeterNumber: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: flatStatusEnum.optional(),
});

export const updateFlatStatusSchema = z.object({
  flatId: z.string().min(1, "Flat ID is required"),
  status: flatStatusEnum,
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
export type BulkCreateFlatsInput = z.infer<typeof bulkCreateFlatsSchema>;
export type UpdateFlatInput = z.infer<typeof updateFlatSchema>;
export type UpdateFlatStatusInput = z.infer<typeof updateFlatStatusSchema>;
export type CreateMaintenanceRequestInput = z.infer<typeof createMaintenanceRequestSchema>;
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;
