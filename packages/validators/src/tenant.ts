import { z } from "zod";
import { paginationSchema } from "./common";
import { orgRoleEnum } from "./organization";

export const memberFilterSchema = paginationSchema.extend({
  role: orgRoleEnum.optional(),
  search: z.string().optional(),
});
export type MemberFilterInput = z.infer<typeof memberFilterSchema>;

export const switchOrganizationSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
});
export type SwitchOrganizationInput = z.infer<typeof switchOrganizationSchema>;

export {
  type CreateOrganizationInput,
  createOrganizationSchema,
  type OrgProductType as ProductType,
  type OrgRole as OrganizationRole,
  orgProductTypeEnum as productTypeEnum,
  orgRoleEnum as organizationRoleEnum,
  type UpdateOrganizationInput,
  updateOrganizationSchema,
} from "./organization";
