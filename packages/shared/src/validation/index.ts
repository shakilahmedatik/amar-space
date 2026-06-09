import { z } from 'zod'

// ─── Common Schemas ─────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
})

export const uuidSchema = z.string().uuid()

// ─── Auth Schemas ───────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase())

export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((val) => /\d/.test(val), {
    message: 'Password must contain at least one digit',
  })

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1),
})

// ─── Building Schemas ───────────────────────────────────────────────────────

export const emergencyContactInputSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(50),
  phone: z.string().max(20).optional().nullable(),
  type: z.enum(['building', 'nearby']),
})

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
})

export const updateBuildingSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().min(1).max(500).optional(),
  totalFloors: z.number().int().min(1).max(200).optional().nullable(),
  whatsappGroupLink: z.string().max(500).optional().nullable(),
  managerPhone: z.string().max(20).optional().nullable(),
  buildingPhoto: z.string().optional().nullable(),
  logoPhoto: z.string().optional().nullable(),
  rules: z.string().max(5000).optional().nullable(),
  emergencyContacts: z.array(emergencyContactInputSchema).optional(),
})

// ─── Flat Schemas ───────────────────────────────────────────────────────────

export const flatStatusEnum = z.enum([
  'vacant',
  'occupied',
  'under_maintenance',
])

export const createFlatSchema = z.object({
  buildingId: uuidSchema,
  flatNumber: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-zA-Z0-9\-_]+$/, {
      message: 'Flat number must be alphanumeric',
    }),
  floor: z.number().int().min(1).max(200),
})

export const updateFlatSchema = z.object({
  flatNumber: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-zA-Z0-9\-_]+$/, {
      message: 'Flat number must be alphanumeric',
    })
    .optional(),
  floor: z.number().int().min(1).max(200).optional(),
  status: flatStatusEnum.optional(),
})

// ─── Renter Schemas ─────────────────────────────────────────────────────────

export const bloodGroupEnum = z.enum([
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
])

export const bdPhoneSchema = z.string().regex(/^01\d{9}$/, {
  message: 'Phone number must be 11 digits starting with 01',
})

export const nidSchema = z.string().regex(/^\d{10,17}$/, {
  message: 'NID must be 10-17 numeric digits',
})

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
  monthlyRent: z.number().min(0.01).max(999_999_999.99),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Start date must be in YYYY-MM-DD format',
  }),
  advanceAmount: z.number().min(0.01).max(99_999_999.99),
  // Optional fields
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  familyMemberNames: z.array(z.string().max(100)).max(20).optional(),
})

// ─── Bill Schemas ───────────────────────────────────────────────────────────

export const billStatusEnum = z.enum([
  'unpaid',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
])

export const billingMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
  message: 'Billing month must be in YYYY-MM format',
})

export const generateBillsSchema = z.object({
  billingMonth: billingMonthSchema,
})

export const generateBillForContractSchema = z.object({
  contractId: uuidSchema,
  billingMonth: billingMonthSchema,
})

export const scheduleTerminationSchema = z.object({
  terminationMonth: billingMonthSchema,
  reason: z.string().max(500).optional(),
})

export const cancelTerminationSchema = z.object({})

export const processDepositRefundSchema = z.object({
  refundAmount: z.number().min(0.01).max(99_999_999.99),
  note: z.string().max(500).optional(),
})

export const addUtilityChargeSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().min(0.01).max(999_999.99),
})

// ─── Payment Schemas ────────────────────────────────────────────────────────

export const paymentMethodEnum = z.enum([
  'cash',
  'bank_transfer',
  'mobile_banking',
])

export const recordPaymentSchema = z.object({
  billId: uuidSchema,
  amount: z.number().min(0.01).max(999_999_999.99),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Payment date must be in YYYY-MM-DD format',
  }),
  paymentMethod: paymentMethodEnum,
  note: z.string().max(500).optional(),
})

// ─── Deposit Schemas ────────────────────────────────────────────────────────

export const applyAdjustmentSchema = z.object({
  amount: z.number().min(0.01).max(99_999_999.99),
  billId: uuidSchema.optional(),
  note: z.string().max(500).optional(),
})

// ─── Maintenance Schemas ────────────────────────────────────────────────────

export const priorityEnum = z.enum(['low', 'medium', 'high', 'urgent'])

export const maintenanceStatusEnum = z.enum([
  'open',
  'in_progress',
  'resolved',
  'closed',
])

export const createMaintenanceRequestSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  priority: priorityEnum,
})

export const updateMaintenanceStatusSchema = z.object({
  status: maintenanceStatusEnum,
})

export const addMaintenanceCommentSchema = z.object({
  content: z.string().min(1).max(2000),
})

// ─── Issue Schemas ──────────────────────────────────────────────────────────

export const issueCategoryEnum = z.enum([
  'plumbing',
  'electrical',
  'structural',
  'cleaning',
  'security',
  'other',
])

export const issueStatusEnum = z.enum([
  'open',
  'in_progress',
  'resolved',
  'closed',
])

export const createIssueSchema = z.object({
  buildingId: uuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: issueCategoryEnum,
  priority: priorityEnum,
})

export const updateIssueStatusSchema = z.object({
  status: issueStatusEnum,
  resolutionNotes: z.string().max(2000).optional(),
})

export const assignIssueSchema = z.object({
  assigneeId: uuidSchema,
})

// ─── Notice Schemas ─────────────────────────────────────────────────────────

export const noticeTargetEnum = z.enum([
  'all_renters',
  'specific_building',
  'specific_flat',
  'managers_only',
])

export const createNoticeSchema = z
  .object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
    targetAudience: noticeTargetEnum,
    targetBuildingId: uuidSchema.optional(),
    targetFlatId: uuidSchema.optional(),
    isPinned: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.targetAudience === 'specific_building') {
        return !!data.targetBuildingId
      }
      return true
    },
    {
      message: 'Building ID is required when targeting a specific building',
      path: ['targetBuildingId'],
    },
  )
  .refine(
    (data) => {
      if (data.targetAudience === 'specific_flat') {
        return !!data.targetFlatId
      }
      return true
    },
    {
      message: 'Flat ID is required when targeting a specific flat',
      path: ['targetFlatId'],
    },
  )

export const updateNoticeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  targetAudience: noticeTargetEnum.optional(),
  targetBuildingId: uuidSchema.optional().nullable(),
  targetFlatId: uuidSchema.optional().nullable(),
})

// ─── File Upload Schemas ────────────────────────────────────────────────────

export const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

export const fileUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(allowedMimeTypes),
  fileSize: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024), // 5MB
})

// ─── Audit Log Schemas ──────────────────────────────────────────────────────

export const auditLogQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: uuidSchema.optional(),
  actorId: uuidSchema.optional(),
  action: z.string().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(100),
})

// ─── Staff Schemas ─────────────────────────────────────────────────────────

export const staffRoleEnum = z.enum(['manager', 'security_guard', 'care_taker'])

export const permissionEffectEnum = z.enum(['grant', 'deny'])

export const createStaffSchema = z.object({
  email: emailSchema,
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(200),
  phone: bdPhoneSchema.optional().nullable(),
  role: staffRoleEnum,
  buildingIds: z.array(uuidSchema).max(100).default([]),
})

export const updateStaffSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: bdPhoneSchema.optional().nullable(),
  role: staffRoleEnum.optional(),
  buildingIds: z.array(uuidSchema).max(100).optional(),
  isActive: z.boolean().optional(),
})

export const updateStaffPermissionsSchema = z.object({
  overrides: z.array(
    z.object({
      permissionKey: z.string().min(1),
      effect: permissionEffectEnum,
    }),
  ),
})

// ─── Admin & Manager Schemas ────────────────────────────────────────────────

export const approvalStatusEnum = z.enum(['pending', 'approved', 'rejected'])

export const userRoleEnum = z.enum(['superadmin', 'owner', 'manager'])

export const createManagerSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(200),
  buildingIds: z.array(uuidSchema).min(1).max(20),
})

export const updateApprovalStatusSchema = z.object({
  newStatus: approvalStatusEnum,
})

export const adminUserListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(50),
  role: userRoleEnum.optional(),
})

export const ownerListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: approvalStatusEnum.optional(),
})

// ─── Type Exports ───────────────────────────────────────────────────────────

export type PaginationInput = z.infer<typeof paginationSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateBuildingInput = z.infer<typeof createBuildingSchema>
export type UpdateBuildingInput = z.infer<typeof updateBuildingSchema>
export type CreateFlatInput = z.infer<typeof createFlatSchema>
export type UpdateFlatInput = z.infer<typeof updateFlatSchema>
export type RegisterRenterInput = z.infer<typeof registerRenterSchema>
export type GenerateBillsInput = z.infer<typeof generateBillsSchema>
export type GenerateBillForContractInput = z.infer<
  typeof generateBillForContractSchema
>
export type ScheduleTerminationInput = z.infer<typeof scheduleTerminationSchema>
export type CancelTerminationInput = z.infer<typeof cancelTerminationSchema>
export type ProcessDepositRefundInput = z.infer<
  typeof processDepositRefundSchema
>
export type AddUtilityChargeInput = z.infer<typeof addUtilityChargeSchema>
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
export type ApplyAdjustmentInput = z.infer<typeof applyAdjustmentSchema>
export type CreateMaintenanceRequestInput = z.infer<
  typeof createMaintenanceRequestSchema
>
export type UpdateMaintenanceStatusInput = z.infer<
  typeof updateMaintenanceStatusSchema
>
export type AddMaintenanceCommentInput = z.infer<
  typeof addMaintenanceCommentSchema
>
export type CreateIssueInput = z.infer<typeof createIssueSchema>
export type UpdateIssueStatusInput = z.infer<typeof updateIssueStatusSchema>
export type AssignIssueInput = z.infer<typeof assignIssueSchema>
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>
export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>
export type FileUploadInput = z.infer<typeof fileUploadSchema>
export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>
export type CreateStaffInput = z.infer<typeof createStaffSchema>
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>
export type UpdateStaffPermissionsInput = z.infer<
  typeof updateStaffPermissionsSchema
>
export type CreateManagerInput = z.infer<typeof createManagerSchema>
export type UpdateApprovalStatusInput = z.infer<
  typeof updateApprovalStatusSchema
>
export type AdminUserListQueryInput = z.infer<typeof adminUserListQuerySchema>
export type OwnerListQueryInput = z.infer<typeof ownerListQuerySchema>
