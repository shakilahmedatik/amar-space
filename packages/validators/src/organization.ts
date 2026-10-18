import { z } from "zod";
import { bdPhoneSchema, emailSchema } from "./common";

export const ORG_ERROR_CODES = {
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  ORG_NOT_FOUND: "ORG_NOT_FOUND",
  ORG_FORBIDDEN: "ORG_FORBIDDEN",
  ORG_SLUG_TAKEN: "ORG_SLUG_TAKEN",
  CANNOT_REMOVE_LAST_OWNER: "CANNOT_REMOVE_LAST_OWNER",
  INVITATION_EXPIRED: "INVITATION_EXPIRED",
  INVITATION_ALREADY_MEMBER: "INVITATION_ALREADY_MEMBER",
  MEMBER_NOT_FOUND: "MEMBER_NOT_FOUND",
  MEMBER_ALREADY_EXISTS: "MEMBER_ALREADY_EXISTS",
} as const;

export type OrgErrorCode = keyof typeof ORG_ERROR_CODES;

export const ORG_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const orgProductTypeEnum = z.enum(["building", "hotel", "resort", "commercial"]);
export type OrgProductType = z.infer<typeof orgProductTypeEnum>;
export const productTypeEnum = orgProductTypeEnum;
export type ProductType = OrgProductType;

export const orgRoleEnum = z.enum(["owner", "admin", "manager", "staff", "member"]);
export type OrgRole = z.infer<typeof orgRoleEnum>;
export const organizationRoleEnum = orgRoleEnum;
export type OrganizationRole = OrgRole;

export const orgInvitationStatusEnum = z.enum(["pending", "accepted", "rejected", "canceled"]);
export type OrgInvitationStatus = z.infer<typeof orgInvitationStatusEnum>;
export const invitationStatusEnum = orgInvitationStatusEnum;
export type InvitationStatus = OrgInvitationStatus;

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must have at least 2 characters")
    .max(100, "Organization name cannot exceed 100 characters"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug cannot exceed 50 characters")
    .regex(
      ORG_SLUG_REGEX,
      "Slug must contain only lowercase letters, numbers, and single hyphens without leading or trailing hyphens",
    ),
  productType: orgProductTypeEnum.default("building"),
  logo: z.string().url("Logo must be a valid URL").optional().nullable(),
  contactPhone: bdPhoneSchema.optional().nullable(),
  contactEmail: emailSchema.optional().nullable(),
  address: z.string().max(500, "Address cannot exceed 500 characters").optional().nullable(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must have at least 2 characters")
    .max(100, "Organization name cannot exceed 100 characters")
    .optional(),
  logo: z.string().url("Logo must be a valid URL").optional().nullable(),
  contactPhone: bdPhoneSchema.optional().nullable(),
  contactEmail: emailSchema.optional().nullable(),
  address: z.string().max(500, "Address cannot exceed 500 characters").optional().nullable(),
  customDomain: z
    .string()
    .max(255)
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Must be a valid domain name")
    .optional()
    .nullable(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: orgRoleEnum.default("staff"),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const acceptInvitationSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required"),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  newRole: z.enum(["owner", "admin", "manager", "staff", "member"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const removeMemberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
