/** Extended user roles including superadmin */
export type UserRole =
  | 'superadmin'
  | 'owner'
  | 'manager'
  | 'security_guard'
  | 'care_taker'
  | 'renter'

/** Approval status for owner accounts */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

/** Staff-specific roles that can be assigned by owners */
export type StaffRole = 'manager' | 'security_guard' | 'care_taker'

/**
 * Role hierarchy ordinals — higher value means higher privilege.
 * Used by the role guard in hierarchical mode.
 */
export const ROLE_ORDINALS: Record<UserRole, number> = {
  superadmin: 5,
  owner: 4,
  manager: 3,
  security_guard: 2,
  care_taker: 2,
  renter: 1,
}

/** Human-readable labels for staff roles */
export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  manager: 'Manager',
  security_guard: 'Security Guard',
  care_taker: 'Care Taker',
}

/**
 * Valid approval status transitions.
 * Maps each status to the set of statuses it can transition to.
 */
export const VALID_APPROVAL_TRANSITIONS: Record<
  ApprovalStatus,
  ApprovalStatus[]
> = {
  pending: ['approved', 'rejected'],
  approved: ['rejected'],
  rejected: ['approved'],
}
