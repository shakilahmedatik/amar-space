import { relations } from 'drizzle-orm'
import { buildings } from './buildings'
import { fileReferences } from './file-references'
import { flats } from './flats'
import { issues } from './issues'
import { maintenanceAttachments } from './maintenance-attachments'
import { maintenanceComments } from './maintenance-comments'
import { maintenanceRequests } from './maintenance-requests'
import { managerAssignments } from './manager-assignments'
import { notices } from './notices'
import { rentalContracts } from './rental-contracts'
import { renters } from './renters'
import { users } from './users'

/**
 * User relations definition.
 *
 * Self-referential relation: ownerAccountId links managers/renters to their owner account.
 * Includes relations to renters and rental_contracts.
 */
export const usersRelations = relations(users, ({ one, many }) => ({
  // Self-referential: a manager/renter belongs to an owner account
  ownerAccount: one(users, {
    fields: [users.ownerAccountId],
    references: [users.id],
    relationName: 'ownerAccountUsers',
  }),
  // Self-referential: an owner has many managed users (managers/renters)
  managedUsers: many(users, {
    relationName: 'ownerAccountUsers',
  }),
  // Renters owned by this user (as owner account)
  ownedRenters: many(renters, {
    relationName: 'ownerRenters',
  }),
  // Renter profile linked to this user account
  renterProfile: many(renters, {
    relationName: 'renterUser',
  }),
}))

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  owner: one(users, {
    fields: [buildings.ownerAccountId],
    references: [users.id],
  }),
  flats: many(flats),
  managerAssignments: many(managerAssignments),
  issues: many(issues),
  maintenanceRequests: many(maintenanceRequests),
}))

export const flatsRelations = relations(flats, ({ one, many }) => ({
  owner: one(users, {
    fields: [flats.ownerAccountId],
    references: [users.id],
  }),
  building: one(buildings, {
    fields: [flats.buildingId],
    references: [buildings.id],
  }),
  rentalContracts: many(rentalContracts),
  maintenanceRequests: many(maintenanceRequests),
}))

export const managerAssignmentsRelations = relations(
  managerAssignments,
  ({ one }) => ({
    owner: one(users, {
      fields: [managerAssignments.ownerAccountId],
      references: [users.id],
      relationName: 'ownerManagerAssignments',
    }),
    manager: one(users, {
      fields: [managerAssignments.managerId],
      references: [users.id],
      relationName: 'managerAssignments',
    }),
    building: one(buildings, {
      fields: [managerAssignments.buildingId],
      references: [buildings.id],
    }),
  }),
)

export const rentersRelations = relations(renters, ({ one, many }) => ({
  owner: one(users, {
    fields: [renters.ownerAccountId],
    references: [users.id],
    relationName: 'ownerRenters',
  }),
  user: one(users, {
    fields: [renters.userId],
    references: [users.id],
    relationName: 'renterUser',
  }),
  rentalContracts: many(rentalContracts),
  maintenanceRequests: many(maintenanceRequests),
}))

export const rentalContractsRelations = relations(
  rentalContracts,
  ({ one }) => ({
    owner: one(users, {
      fields: [rentalContracts.ownerAccountId],
      references: [users.id],
    }),
    renter: one(renters, {
      fields: [rentalContracts.renterId],
      references: [renters.id],
    }),
    flat: one(flats, {
      fields: [rentalContracts.flatId],
      references: [flats.id],
    }),
  }),
)

export const issuesRelations = relations(issues, ({ one }) => ({
  owner: one(users, {
    fields: [issues.ownerAccountId],
    references: [users.id],
    relationName: 'ownerIssues',
  }),
  building: one(buildings, {
    fields: [issues.buildingId],
    references: [buildings.id],
  }),
  assignee: one(users, {
    fields: [issues.assigneeId],
    references: [users.id],
    relationName: 'assignedIssues',
  }),
}))

export const noticesRelations = relations(notices, ({ one }) => ({
  owner: one(users, {
    fields: [notices.ownerAccountId],
    references: [users.id],
    relationName: 'ownerNotices',
  }),
  author: one(users, {
    fields: [notices.authorId],
    references: [users.id],
    relationName: 'authoredNotices',
  }),
  targetBuilding: one(buildings, {
    fields: [notices.targetBuildingId],
    references: [buildings.id],
  }),
  targetFlat: one(flats, {
    fields: [notices.targetFlatId],
    references: [flats.id],
  }),
}))

export const fileReferencesRelations = relations(fileReferences, ({ one }) => ({
  owner: one(users, {
    fields: [fileReferences.ownerAccountId],
    references: [users.id],
  }),
}))

export const maintenanceRequestsRelations = relations(
  maintenanceRequests,
  ({ one, many }) => ({
    owner: one(users, {
      fields: [maintenanceRequests.ownerAccountId],
      references: [users.id],
    }),
    flat: one(flats, {
      fields: [maintenanceRequests.flatId],
      references: [flats.id],
    }),
    renter: one(renters, {
      fields: [maintenanceRequests.renterId],
      references: [renters.id],
    }),
    building: one(buildings, {
      fields: [maintenanceRequests.buildingId],
      references: [buildings.id],
    }),
    attachments: many(maintenanceAttachments),
    comments: many(maintenanceComments),
  }),
)

export const maintenanceAttachmentsRelations = relations(
  maintenanceAttachments,
  ({ one }) => ({
    request: one(maintenanceRequests, {
      fields: [maintenanceAttachments.requestId],
      references: [maintenanceRequests.id],
    }),
  }),
)

export const maintenanceCommentsRelations = relations(
  maintenanceComments,
  ({ one }) => ({
    request: one(maintenanceRequests, {
      fields: [maintenanceComments.requestId],
      references: [maintenanceRequests.id],
    }),
    author: one(users, {
      fields: [maintenanceComments.authorId],
      references: [users.id],
    }),
  }),
)
