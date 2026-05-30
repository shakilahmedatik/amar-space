/** Extended user roles including superadmin */
export type UserRole = 'superadmin' | 'owner' | 'manager' | 'renter'

/** Approval status for owner accounts */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

/**
 * Role hierarchy ordinals — higher value means higher privilege.
 * Used by the role guard in hierarchical mode.
 */
export const ROLE_ORDINALS: Record<UserRole, number> = {
  superadmin: 4,
  owner: 3,
  manager: 2,
  renter: 1,
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
