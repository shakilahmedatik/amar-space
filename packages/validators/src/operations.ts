import { z } from "zod";

// Maintenance Ticket Enums
export const maintenanceCategoryEnum = z.enum([
  "plumbing",
  "electrical",
  "generator",
  "elevator",
  "carpentry",
  "sanitary",
  "appliance",
  "hvac",
  "pest_control",
  "general",
]);
export type MaintenanceCategory = z.infer<typeof maintenanceCategoryEnum>;

export const maintenancePriorityEnum = z.enum(["low", "medium", "high", "urgent"]);
export type MaintenancePriority = z.infer<typeof maintenancePriorityEnum>;

export const maintenanceStatusEnum = z.enum([
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
]);
export type MaintenanceStatus = z.infer<typeof maintenanceStatusEnum>;

export const costBilledToEnum = z.enum(["landlord", "tenant", "shared"]);
export type CostBilledTo = z.infer<typeof costBilledToEnum>;

// Notice Enums
export const targetAudienceEnum = z.enum([
  "all_renters",
  "specific_building",
  "specific_flat",
  "managers_only",
]);
export type TargetAudience = z.infer<typeof targetAudienceEnum>;

// Schema: Create Maintenance Ticket
export const createMaintenanceRequestSchema = z.object({
  buildingId: z.string().min(1, "Building ID is required"),
  flatId: z.string().optional().nullable(),
  category: maintenanceCategoryEnum.default("general"),
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title cannot exceed 120 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must provide details (at least 10 characters)")
    .max(2000, "Description cannot exceed 2000 characters"),
  priority: maintenancePriorityEnum.default("medium"),
  photoUrls: z.array(z.string().url("Must be a valid URL")).max(5).default([]),
});
export type CreateMaintenanceRequestInput = z.infer<typeof createMaintenanceRequestSchema>;

// Schema: Update Maintenance Ticket Status
export const updateRequestStatusSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  status: z.enum(["open", "assigned", "in_progress", "closed"]),
});
export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>;

// Schema: Assign Staff to Maintenance Ticket
export const assignStaffSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  staffUserId: z.string().min(1, "Staff user ID is required"),
});
export type AssignStaffInput = z.infer<typeof assignStaffSchema>;

// Schema: Resolve Maintenance Ticket (Requires resolution notes)
export const resolveMaintenanceRequestSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  resolutionNotes: z
    .string()
    .trim()
    .min(5, "Resolution notes and repair diagnosis are required (at least 5 characters)"),
  repairCost: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "number" ? val : Number.parseFloat(val);
      if (Number.isNaN(num) || num < 0) return "0.00";
      return num.toFixed(2);
    })
    .default("0.00"),
  costBilledTo: costBilledToEnum.default("landlord"),
  resolutionPhotoUrls: z.array(z.string().url("Must be a valid URL")).max(5).default([]),
});
export type ResolveMaintenanceRequestInput = z.infer<typeof resolveMaintenanceRequestSchema>;

// Schema: Create Notice
export const createNoticeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Notice title must be at least 3 characters")
    .max(150, "Notice title cannot exceed 150 characters"),
  body: z.string().trim().min(10, "Notice body content must be at least 10 characters"),
  targetAudience: targetAudienceEnum.default("all_renters"),
  targetBuildingId: z.string().optional().nullable(),
  targetFlatId: z.string().optional().nullable(),
  isPinned: z.boolean().default(false),
  expiresAt: z
    .union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.date()])
    .optional()
    .nullable(),
});
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;

// Schema: Pin / Unpin Notice
export const pinNoticeSchema = z.object({
  noticeId: z.string().min(1, "Notice ID is required"),
  isPinned: z.boolean(),
});
export type PinNoticeInput = z.infer<typeof pinNoticeSchema>;

// Helper: Check if notice is active based on expiresAt timestamp
export function isNoticeActive(
  expiresAt: Date | string | null | undefined,
  referenceDate = new Date(),
): boolean {
  if (!expiresAt) return true;
  const expiry = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return expiry.getTime() > referenceDate.getTime();
}

// Domain Error Codes
export const OPERATIONS_ERROR_CODES = {
  TICKET_NOT_FOUND: "TICKET_NOT_FOUND",
  TICKET_ALREADY_CLOSED: "TICKET_ALREADY_CLOSED",
  RESOLUTION_NOTES_REQUIRED: "RESOLUTION_NOTES_REQUIRED",
  FORBIDDEN_TICKET_ACCESS: "FORBIDDEN_TICKET_ACCESS",
  NOTICE_EXPIRED: "NOTICE_EXPIRED",
  CANNOT_ASSIGN_UNCONFIRMED_STAFF: "CANNOT_ASSIGN_UNCONFIRMED_STAFF",
  INVALID_REPAIR_COST: "INVALID_REPAIR_COST",
} as const;

export type OperationsErrorCode =
  (typeof OPERATIONS_ERROR_CODES)[keyof typeof OPERATIONS_ERROR_CODES];
