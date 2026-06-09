/** User roles */
export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  SECURITY_GUARD: 'security_guard',
  CARE_TAKER: 'care_taker',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/** Flat status values */
export const FLAT_STATUS = {
  VACANT: 'vacant',
  OCCUPIED: 'occupied',
  UNDER_MAINTENANCE: 'under_maintenance',
} as const

export type FlatStatus = (typeof FLAT_STATUS)[keyof typeof FLAT_STATUS]

/** Bill status values */
export const BILL_STATUS = {
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const

export type BillStatus = (typeof BILL_STATUS)[keyof typeof BILL_STATUS]

/** Maintenance request status values */
export const MAINTENANCE_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const

export type MaintenanceStatus =
  (typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS]

/** Issue status values */
export const ISSUE_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const

export type IssueStatus = (typeof ISSUE_STATUS)[keyof typeof ISSUE_STATUS]

/** Payment methods */
export const PAYMENT_METHODS = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  MOBILE_BANKING: 'mobile_banking',
} as const

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS]

/** Issue categories */
export const ISSUE_CATEGORIES = {
  PLUMBING: 'plumbing',
  ELECTRICAL: 'electrical',
  STRUCTURAL: 'structural',
  CLEANING: 'cleaning',
  SECURITY: 'security',
  OTHER: 'other',
} as const

export type IssueCategory =
  (typeof ISSUE_CATEGORIES)[keyof typeof ISSUE_CATEGORIES]

/** Priority levels */
export const PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const

export type Priority = (typeof PRIORITIES)[keyof typeof PRIORITIES]

/** Notice target audience */
export const NOTICE_TARGETS = {
  ALL_RENTERS: 'all_renters',
  SPECIFIC_BUILDING: 'specific_building',
  SPECIFIC_FLAT: 'specific_flat',
  MANAGERS_ONLY: 'managers_only',
} as const

export type NoticeTarget = (typeof NOTICE_TARGETS)[keyof typeof NOTICE_TARGETS]

/** Blood group values */
export const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const

export type BloodGroup = (typeof BLOOD_GROUPS)[number]

/** Contract status values */
export const CONTRACT_STATUS = {
  ACTIVE: 'active',
  PENDING_TERMINATION: 'pending_termination',
  TERMINATED: 'terminated',
} as const

export type ContractStatus =
  (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS]

/** State machine transition maps */
export const FLAT_STATUS_TRANSITIONS: Record<FlatStatus, FlatStatus[]> = {
  [FLAT_STATUS.VACANT]: [FLAT_STATUS.OCCUPIED, FLAT_STATUS.UNDER_MAINTENANCE],
  [FLAT_STATUS.OCCUPIED]: [FLAT_STATUS.VACANT],
  [FLAT_STATUS.UNDER_MAINTENANCE]: [FLAT_STATUS.VACANT],
}

export const BILL_STATUS_TRANSITIONS: Record<BillStatus, BillStatus[]> = {
  [BILL_STATUS.UNPAID]: [
    BILL_STATUS.PARTIALLY_PAID,
    BILL_STATUS.PAID,
    BILL_STATUS.OVERDUE,
    BILL_STATUS.CANCELLED,
  ],
  [BILL_STATUS.PARTIALLY_PAID]: [
    BILL_STATUS.PAID,
    BILL_STATUS.OVERDUE,
    BILL_STATUS.CANCELLED,
  ],
  [BILL_STATUS.OVERDUE]: [
    BILL_STATUS.PARTIALLY_PAID,
    BILL_STATUS.PAID,
    BILL_STATUS.CANCELLED,
  ],
  [BILL_STATUS.PAID]: [],
  [BILL_STATUS.CANCELLED]: [],
}

export const CONTRACT_STATUS_TRANSITIONS: Record<
  ContractStatus,
  ContractStatus[]
> = {
  [CONTRACT_STATUS.ACTIVE]: [
    CONTRACT_STATUS.PENDING_TERMINATION,
    CONTRACT_STATUS.TERMINATED,
  ],
  [CONTRACT_STATUS.PENDING_TERMINATION]: [
    CONTRACT_STATUS.ACTIVE,
    CONTRACT_STATUS.TERMINATED,
  ],
  [CONTRACT_STATUS.TERMINATED]: [],
}

export const MAINTENANCE_STATUS_TRANSITIONS: Record<
  MaintenanceStatus,
  MaintenanceStatus[]
> = {
  [MAINTENANCE_STATUS.OPEN]: [
    MAINTENANCE_STATUS.IN_PROGRESS,
    MAINTENANCE_STATUS.CLOSED,
  ],
  [MAINTENANCE_STATUS.IN_PROGRESS]: [
    MAINTENANCE_STATUS.RESOLVED,
    MAINTENANCE_STATUS.CLOSED,
  ],
  [MAINTENANCE_STATUS.RESOLVED]: [
    MAINTENANCE_STATUS.CLOSED,
    MAINTENANCE_STATUS.IN_PROGRESS,
  ],
  [MAINTENANCE_STATUS.CLOSED]: [],
}

export const ISSUE_STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  [ISSUE_STATUS.OPEN]: [
    ISSUE_STATUS.IN_PROGRESS,
    ISSUE_STATUS.RESOLVED,
    ISSUE_STATUS.CLOSED,
  ],
  [ISSUE_STATUS.IN_PROGRESS]: [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED],
  [ISSUE_STATUS.RESOLVED]: [ISSUE_STATUS.CLOSED],
  [ISSUE_STATUS.CLOSED]: [],
}

/** Role permissions - defines what each role can access */
export const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: [
    'buildings:read',
    'buildings:write',
    'flats:read',
    'flats:write',
    'flats:delete',
    'renters:read',
    'renters:write',
    'bills:read',
    'bills:write',
    'payments:read',
    'payments:write',
    'deposits:read',
    'deposits:write',
    'maintenance:read',
    'maintenance:write',
    'issues:read',
    'issues:write',
    'notices:read',
    'notices:write',
    'notices:delete',
    'audit:read',
    'roles:write',
    'staff:read',
    'staff:write',
    'contracts:terminate',
    'terminations:execute',
  ],
  [ROLES.MANAGER]: [
    'buildings:read',
    'flats:read',
    'flats:write',
    'renters:read',
    'renters:write',
    'bills:read',
    'bills:write',
    'payments:read',
    'payments:write',
    'deposits:read',
    'maintenance:read',
    'maintenance:write',
    'issues:read',
    'issues:write',
    'notices:read',
    'notices:write',
    'contracts:terminate',
  ],
  [ROLES.SECURITY_GUARD]: [
    'buildings:read',
    'flats:read',
    'maintenance:read',
    'maintenance:write',
    'issues:read',
    'issues:write',
    'notices:read',
  ],
  [ROLES.CARE_TAKER]: [
    'buildings:read',
    'flats:read',
    'maintenance:read',
    'maintenance:write',
    'issues:read',
    'issues:write',
    'notices:read',
  ],
} as const satisfies Record<string, readonly string[]>

export type Permission =
  (typeof ROLE_PERMISSIONS)[keyof typeof ROLE_PERMISSIONS][number]

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  AUDIT_MAX_PAGE_SIZE: 100,
} as const
