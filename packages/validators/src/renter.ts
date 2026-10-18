import { z } from "zod";
import { bdPhoneSchema, uuidSchema } from "./common";

// Bangladeshi NID Regex (10-digit Smart NID or 17-digit Legacy NID)
export const BANGLADESH_NID_REGEX = /^(?:\d{10}|\d{17})$/;

export const renterNidSchema = z
  .string()
  .transform((val) => val.replace(/[\s-]/g, ""))
  .pipe(
    z.string().regex(BANGLADESH_NID_REGEX, {
      message: "National ID must be a valid 10-digit Smart NID or 17-digit legacy NID",
    }),
  );

// Blood Group Enum (ABO System + Rh Factor)
export const bloodGroupEnum = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

export type BloodGroup = z.infer<typeof bloodGroupEnum>;

// Domain Error Codes
export const RENTER_ERROR_CODES = {
  NID_INVALID_FORMAT: "NID_INVALID_FORMAT",
  NID_ALREADY_EXISTS: "NID_ALREADY_EXISTS",
  FLAT_ALREADY_OCCUPIED: "FLAT_ALREADY_OCCUPIED",
  INVALID_BLOOD_GROUP: "INVALID_BLOOD_GROUP",
  CONTRACT_NOT_IN_DRAFT: "CONTRACT_NOT_IN_DRAFT",
  RENTER_NOT_FOUND: "RENTER_NOT_FOUND",
  CONTRACT_NOT_FOUND: "CONTRACT_NOT_FOUND",
  DEPOSIT_MISMATCH: "DEPOSIT_MISMATCH",
} as const;

export type RenterErrorCode = keyof typeof RENTER_ERROR_CODES;

// Create Renter Schema (KYC profile)
export const createRenterSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(255),
  phone: bdPhoneSchema,
  nidNumber: renterNidSchema,
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth format must be YYYY-MM-DD")
    .optional()
    .nullable(),
  occupation: z.string().min(2, "Occupation must be at least 2 characters").max(200),
  bloodGroup: bloodGroupEnum,
  totalFamilyMembers: z.number().int().min(1).max(50).default(1),
  familyMemberNames: z.array(z.string().min(1).max(100)).max(30).optional().default([]),
  emergencyContactName: z
    .string()
    .min(2, "Emergency contact name must be at least 2 characters")
    .max(200),
  emergencyContactNumber: bdPhoneSchema,
  emergencyContactRelationship: z
    .string()
    .min(1, "Relationship to emergency contact is required")
    .max(100),
  nidFrontPhoto: z.string().url("Valid URL required for NID front photo").optional().nullable(),
  nidBackPhoto: z.string().url("Valid URL required for NID back photo").optional().nullable(),
  digitalSignatureUrl: z
    .string()
    .url("Valid URL required for digital signature")
    .optional()
    .nullable(),
  userId: z.string().optional().nullable(),
  flatId: z.string().optional().nullable(),
});

export type CreateRenterInput = z.infer<typeof createRenterSchema>;

// Update Renter Schema
export const updateRenterSchema = z.object({
  id: z.string().min(1, "Renter ID is required"),
  fullName: z.string().min(2).max(255).optional(),
  phone: bdPhoneSchema.optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  occupation: z.string().min(2).max(200).optional(),
  bloodGroup: bloodGroupEnum.optional(),
  totalFamilyMembers: z.number().int().min(1).max(50).optional(),
  familyMemberNames: z.array(z.string().min(1).max(100)).max(30).optional(),
  emergencyContactName: z.string().min(2).max(200).optional(),
  emergencyContactNumber: bdPhoneSchema.optional(),
  emergencyContactRelationship: z.string().min(1).max(100).optional(),
  nidFrontPhoto: z.string().url().optional().nullable(),
  nidBackPhoto: z.string().url().optional().nullable(),
  digitalSignatureUrl: z.string().url().optional().nullable(),
});

export type UpdateRenterInput = z.infer<typeof updateRenterSchema>;

// Contract Status Enum
export const contractStatusEnum = z.enum([
  "draft",
  "pending_signature",
  "active",
  "notice_period",
  "terminated",
]);

export type ContractStatus = z.infer<typeof contractStatusEnum>;

// Create Tenancy Contract Schema
export const createContractSchema = z.object({
  renterId: z.string().min(1, "Renter ID is required"),
  flatId: z.string().min(1, "Flat ID is required"),
  monthlyRent: z.number().positive("Monthly rent must be greater than 0"),
  serviceCharge: z.number().min(0, "Service charge cannot be negative").default(0),
  securityDepositAmount: z.number().min(0, "Security deposit cannot be negative").default(0),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must follow YYYY-MM-DD format"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must follow YYYY-MM-DD format")
    .optional()
    .nullable(),
  noticePeriodDays: z.number().int().min(15).max(180).default(30),
  contractDocumentUrl: z.string().url().optional().nullable(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;

// Submit Notice Period Schema
export const submitNoticePeriodSchema = z.object({
  contractId: z.string().min(1, "Contract ID is required"),
  expectedDepartureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected departure date must follow YYYY-MM-DD format"),
  reason: z.string().min(3, "Notice reason must be at least 3 characters").max(500),
});

export type SubmitNoticePeriodInput = z.infer<typeof submitNoticePeriodSchema>;

// Terminate Tenancy Contract Schema
export const terminateContractSchema = z.object({
  contractId: z.string().min(1, "Contract ID is required"),
  terminationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Termination date must follow YYYY-MM-DD format"),
  terminationReason: z.string().min(3, "Termination reason is required").max(500),
  deductions: z.number().min(0, "Deductions cannot be negative").default(0),
  refundAmount: z.number().min(0, "Refund amount cannot be negative").default(0),
  nextFlatStatus: z.enum(["vacant", "under_maintenance"]).default("vacant"),
  inspectionNotes: z.string().max(1000).optional().nullable(),
});

export type TerminateContractInput = z.infer<typeof terminateContractSchema>;

// Backward compatibility schema for existing tests/references
export const registerRenterSchema = z.object({
  fullName: z.string().min(1).max(255),
  phone: bdPhoneSchema,
  nidNumber: renterNidSchema,
  occupation: z.string().min(1).max(200),
  bloodGroup: bloodGroupEnum,
  totalFamilyMembers: z.number().int().min(1).max(50),
  emergencyContactName: z.string().min(1).max(200),
  emergencyContactNumber: bdPhoneSchema,
  emergencyContactRelationship: z.string().min(1).max(100),
  flatId: uuidSchema.optional().nullable(),
  monthlyRent: z.number().min(0.01),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  advanceAmount: z.number().min(0).default(0),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  familyMemberNames: z.array(z.string().max(100)).max(20).optional(),
});

export type RegisterRenterInput = z.infer<typeof registerRenterSchema>;
