import { relations } from "drizzle-orm";
import { users } from "./auth";
import { advanceAdjustments, bills, payments } from "./billing";
import { buildings, emergencyContacts, flats } from "./building";
import { bookings, rooms, roomTypes } from "./hotel";
import { auditLogs, maintenanceRequests, notices } from "./operations";
import { invitations, members, organizations } from "./organizations";
import { rentalContracts, renters } from "./renters";
import { subscriptions } from "./subscriptions";
import { websiteConfigs } from "./website-configs";

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(members),
  sentInvitations: many(invitations),
  auditLogs: many(auditLogs),
}));

export const membersRelations = relations(members, ({ one }) => ({
  organization: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [invitations.inviterId],
    references: [users.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  members: many(members),
  invitations: many(invitations),
  subscription: one(subscriptions, {
    fields: [organizations.id],
    references: [subscriptions.organizationId],
  }),
  websiteConfig: one(websiteConfigs, {
    fields: [organizations.id],
    references: [websiteConfigs.organizationId],
  }),
  buildings: many(buildings),
  roomTypes: many(roomTypes),
  rooms: many(rooms),
  bookings: many(bookings),
  renters: many(renters),
  maintenanceRequests: many(maintenanceRequests),
  notices: many(notices),
  auditLogs: many(auditLogs),
  bills: many(bills),
  payments: many(payments),
  advanceAdjustments: many(advanceAdjustments),
}));

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [buildings.organizationId],
    references: [organizations.id],
  }),
  flats: many(flats),
  emergencyContacts: many(emergencyContacts),
  maintenanceRequests: many(maintenanceRequests),
  notices: many(notices),
}));

export const flatsRelations = relations(flats, ({ one, many }) => ({
  building: one(buildings, {
    fields: [flats.buildingId],
    references: [buildings.id],
  }),
  renters: many(renters),
  rentalContracts: many(rentalContracts),
  maintenanceRequests: many(maintenanceRequests),
}));

export const roomTypesRelations = relations(roomTypes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [roomTypes.organizationId],
    references: [organizations.id],
  }),
  rooms: many(rooms),
  bookings: many(bookings),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  roomType: one(roomTypes, {
    fields: [rooms.roomTypeId],
    references: [roomTypes.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [bookings.organizationId],
    references: [organizations.id],
  }),
  roomType: one(roomTypes, {
    fields: [bookings.roomTypeId],
    references: [roomTypes.id],
  }),
  room: one(rooms, {
    fields: [bookings.roomId],
    references: [rooms.id],
  }),
  payments: many(payments),
}));

export const rentersRelations = relations(renters, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [renters.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [renters.userId],
    references: [users.id],
  }),
  flat: one(flats, {
    fields: [renters.flatId],
    references: [flats.id],
  }),
  contracts: many(rentalContracts),
}));

export const rentalContractsRelations = relations(rentalContracts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [rentalContracts.organizationId],
    references: [organizations.id],
  }),
  renter: one(renters, {
    fields: [rentalContracts.renterId],
    references: [renters.id],
  }),
  flat: one(flats, {
    fields: [rentalContracts.flatId],
    references: [flats.id],
  }),
  bills: many(bills),
  advanceAdjustments: many(advanceAdjustments),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [bills.organizationId],
    references: [organizations.id],
  }),
  contract: one(rentalContracts, {
    fields: [bills.contractId],
    references: [rentalContracts.id],
  }),
  payments: many(payments),
  advanceAdjustments: many(advanceAdjustments),
}));

export const advanceAdjustmentsRelations = relations(advanceAdjustments, ({ one }) => ({
  organization: one(organizations, {
    fields: [advanceAdjustments.organizationId],
    references: [organizations.id],
  }),
  contract: one(rentalContracts, {
    fields: [advanceAdjustments.contractId],
    references: [rentalContracts.id],
  }),
  bill: one(bills, {
    fields: [advanceAdjustments.adjustedAgainstBillId],
    references: [bills.id],
  }),
  adjustedByUser: one(users, {
    fields: [advanceAdjustments.adjustedBy],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  bill: one(bills, {
    fields: [payments.billId],
    references: [bills.id],
  }),
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
  receivedByUser: one(users, {
    fields: [payments.receivedBy],
    references: [users.id],
  }),
}));

export const maintenanceRequestsRelations = relations(maintenanceRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [maintenanceRequests.organizationId],
    references: [organizations.id],
  }),
  building: one(buildings, {
    fields: [maintenanceRequests.buildingId],
    references: [buildings.id],
  }),
  flat: one(flats, {
    fields: [maintenanceRequests.flatId],
    references: [flats.id],
  }),
  requestedByUser: one(users, {
    fields: [maintenanceRequests.requestedByUserId],
    references: [users.id],
  }),
  assignedToStaff: one(users, {
    fields: [maintenanceRequests.assignedToStaffId],
    references: [users.id],
  }),
}));

export const noticesRelations = relations(notices, ({ one }) => ({
  organization: one(organizations, {
    fields: [notices.organizationId],
    references: [organizations.id],
  }),
  targetBuilding: one(buildings, {
    fields: [notices.targetBuildingId],
    references: [buildings.id],
  }),
  targetFlat: one(flats, {
    fields: [notices.targetFlatId],
    references: [flats.id],
  }),
  authorUser: one(users, {
    fields: [notices.authorUserId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  actorUser: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));
