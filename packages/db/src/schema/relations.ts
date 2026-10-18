import { relations } from "drizzle-orm";
import { users } from "./auth";
import { bills, payments } from "./billing";
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
}));

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [buildings.organizationId],
    references: [organizations.id],
  }),
  flats: many(flats),
  emergencyContacts: many(emergencyContacts),
}));

export const flatsRelations = relations(flats, ({ one, many }) => ({
  building: one(buildings, {
    fields: [flats.buildingId],
    references: [buildings.id],
  }),
  renters: many(renters),
  rentalContracts: many(rentalContracts),
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
  flat: one(flats, {
    fields: [renters.flatId],
    references: [flats.id],
  }),
  contracts: many(rentalContracts),
}));

export const rentalContractsRelations = relations(rentalContracts, ({ one, many }) => ({
  renter: one(renters, {
    fields: [rentalContracts.renterId],
    references: [renters.id],
  }),
  flat: one(flats, {
    fields: [rentalContracts.flatId],
    references: [flats.id],
  }),
  bills: many(bills),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  contract: one(rentalContracts, {
    fields: [bills.contractId],
    references: [rentalContracts.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  bill: one(bills, {
    fields: [payments.billId],
    references: [bills.id],
  }),
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));
