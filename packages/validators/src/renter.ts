import { z } from "zod";
import { bdPhoneSchema, nidSchema, uuidSchema } from "./common";

export const bloodGroupEnum = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

export const registerRenterSchema = z.object({
  fullName: z.string().min(1).max(255),
  phone: bdPhoneSchema,
  nidNumber: nidSchema,
  occupation: z.string().min(1).max(200),
  bloodGroup: bloodGroupEnum,
  totalFamilyMembers: z.number().int().min(1).max(50),
  emergencyContactName: z.string().min(1).max(200),
  emergencyContactNumber: bdPhoneSchema,
  emergencyContactRelationship: z.string().min(1).max(100),
  flatId: uuidSchema,
  monthlyRent: z.number().min(0.01),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  advanceAmount: z.number().min(0),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  familyMemberNames: z.array(z.string().max(100)).max(20).optional(),
});

export type RegisterRenterInput = z.infer<typeof registerRenterSchema>;
