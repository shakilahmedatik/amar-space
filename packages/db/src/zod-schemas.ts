import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import * as schema from "./schema";

// Auth tables
export const insertUserSchema = createInsertSchema(schema.users);
export const selectUserSchema = createSelectSchema(schema.users);

export const insertSessionSchema = createInsertSchema(schema.sessions);
export const selectSessionSchema = createSelectSchema(schema.sessions);

export const insertAccountSchema = createInsertSchema(schema.accounts);
export const selectAccountSchema = createSelectSchema(schema.accounts);

export const insertVerificationSchema = createInsertSchema(schema.verifications);
export const selectVerificationSchema = createSelectSchema(schema.verifications);

// Organizations & Members
export const insertOrganizationSchema = createInsertSchema(schema.organizations);
export const selectOrganizationSchema = createSelectSchema(schema.organizations);

export const insertMemberSchema = createInsertSchema(schema.members);
export const selectMemberSchema = createSelectSchema(schema.members);

export const insertInvitationSchema = createInsertSchema(schema.invitations);
export const selectInvitationSchema = createSelectSchema(schema.invitations);

// Property, Buildings & Flats
export const insertBuildingSchema = createInsertSchema(schema.buildings);
export const selectBuildingSchema = createSelectSchema(schema.buildings);

export const insertFlatSchema = createInsertSchema(schema.flats);
export const selectFlatSchema = createSelectSchema(schema.flats);

export const insertEmergencyContactSchema = createInsertSchema(schema.emergencyContacts);
export const selectEmergencyContactSchema = createSelectSchema(schema.emergencyContacts);

// Renters & Contracts
export const insertRenterSchema = createInsertSchema(schema.renters);
export const selectRenterSchema = createSelectSchema(schema.renters);

export const insertRentalContractSchema = createInsertSchema(schema.rentalContracts);
export const selectRentalContractSchema = createSelectSchema(schema.rentalContracts);

// Billing, Adjustments & Payments
export const insertBillSchema = createInsertSchema(schema.bills);
export const selectBillSchema = createSelectSchema(schema.bills);

export const insertAdvanceAdjustmentSchema = createInsertSchema(schema.advanceAdjustments);
export const selectAdvanceAdjustmentSchema = createSelectSchema(schema.advanceAdjustments);

export const insertPaymentSchema = createInsertSchema(schema.payments);
export const selectPaymentSchema = createSelectSchema(schema.payments);

// Maintenance Requests & Notices
export const insertMaintenanceRequestSchema = createInsertSchema(schema.maintenanceRequests);
export const selectMaintenanceRequestSchema = createSelectSchema(schema.maintenanceRequests);

export const insertNoticeSchema = createInsertSchema(schema.notices);
export const selectNoticeSchema = createSelectSchema(schema.notices);

// Hotel & Resort PMS
export const insertRoomTypeSchema = createInsertSchema(schema.roomTypes);
export const selectRoomTypeSchema = createSelectSchema(schema.roomTypes);

export const insertRoomSchema = createInsertSchema(schema.rooms);
export const selectRoomSchema = createSelectSchema(schema.rooms);

export const insertBookingSchema = createInsertSchema(schema.bookings);
export const selectBookingSchema = createSelectSchema(schema.bookings);

// Subscriptions & Plans
export const insertSubscriptionPlanSchema = createInsertSchema(schema.subscriptionPlans);
export const selectSubscriptionPlanSchema = createSelectSchema(schema.subscriptionPlans);

export const insertSubscriptionSchema = createInsertSchema(schema.subscriptions);
export const selectSubscriptionSchema = createSelectSchema(schema.subscriptions);

// Website Configurations
export const insertWebsiteConfigSchema = createInsertSchema(schema.websiteConfigs);
export const selectWebsiteConfigSchema = createSelectSchema(schema.websiteConfigs);

// Audit Logs
export const insertAuditLogSchema = createInsertSchema(schema.auditLogs);
export const selectAuditLogSchema = createSelectSchema(schema.auditLogs);
