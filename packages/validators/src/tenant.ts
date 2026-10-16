import { z } from "zod";

export const productTypeEnum = z.enum(["hotel", "resort", "building", "flat"]);

export const organizationRoleEnum = z.enum([
  "superadmin",
  "owner",
  "manager",
  "staff",
  "renter",
  "customer",
]);

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug must contain only lowercase letters, numbers, and hyphens",
    }),
  productType: productTypeEnum,
  contactPhone: z.string().max(20).optional().nullable(),
  contactEmail: z.string().email().max(254).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  contactPhone: z.string().max(20).optional().nullable(),
  contactEmail: z.string().email().max(254).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  customDomain: z
    .string()
    .max(255)
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
      message: "Must be a valid domain name",
    })
    .optional()
    .nullable(),
});

export type ProductType = z.infer<typeof productTypeEnum>;
export type OrganizationRole = z.infer<typeof organizationRoleEnum>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
