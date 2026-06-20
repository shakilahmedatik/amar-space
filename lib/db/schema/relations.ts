import { relations } from "drizzle-orm";
import { buildings } from "./buildings";
import { emergencyContacts } from "./emergency-contacts";
import { fileReferences } from "./file-references";
import { flatSlugs } from "./flat-slugs";
import { flats } from "./flats";
import { issueAttachments } from "./issue-attachments";
import { issues } from "./issues";
import { maintenanceAttachments } from "./maintenance-attachments";
import { maintenanceComments } from "./maintenance-comments";
import { maintenanceRequests } from "./maintenance-requests";
import { managerAssignments } from "./manager-assignments";
import { noticeTemplates, notices } from "./notices";
import { permissions } from "./permissions";
import { portalSessions } from "./portal-sessions";
import { registrationRequests } from "./registration-requests";
import { rentalContracts } from "./rental-contracts";
import { renterAccessCodes } from "./renter-access-codes";
import { renters } from "./renters";
import { rolePermissions } from "./role-permissions";
import { staffBuildingAssignments } from "./staff-building-assignments";
import { staffRoles } from "./staff-roles";
import { userPermissionOverrides } from "./user-permission-overrides";
import { users } from "./users";

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
		relationName: "ownerAccountUsers",
	}),
	// Self-referential: an owner has many managed users (managers/renters)
	managedUsers: many(users, {
		relationName: "ownerAccountUsers",
	}),
	// Renters owned by this user (as owner account)
	ownedRenters: many(renters, {
		relationName: "ownerRenters",
	}),
	// Renter profile linked to this user account
	renterProfile: many(renters, {
		relationName: "renterUser",
	}),
	// Staff roles owned by this user
	staffRoles: many(staffRoles, {
		relationName: "ownerStaffRoles",
	}),
	// Permission overrides for this user
	permissionOverrides: many(userPermissionOverrides, {
		relationName: "userPermissionOverrides",
	}),
	// Staff building assignments (as the staff member)
	staffAssignments: many(staffBuildingAssignments, {
		relationName: "staffBuildingAssignments",
	}),
	// Staff building assignments (as the owner)
	ownedStaffAssignments: many(staffBuildingAssignments, {
		relationName: "ownerStaffAssignments",
	}),
}));

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
	owner: one(users, {
		fields: [buildings.ownerAccountId],
		references: [users.id],
	}),
	flats: many(flats),
	managerAssignments: many(managerAssignments),
	staffAssignments: many(staffBuildingAssignments),
	issues: many(issues),
	maintenanceRequests: many(maintenanceRequests),
	emergencyContacts: many(emergencyContacts),
}));

export const flatsRelations = relations(flats, ({ one, many }) => ({
	owner: one(users, {
		fields: [flats.ownerAccountId],
		references: [users.id],
	}),
	building: one(buildings, {
		fields: [flats.buildingId],
		references: [buildings.id],
	}),
	flatSlug: one(flatSlugs, {
		fields: [flats.id],
		references: [flatSlugs.flatId],
	}),
	rentalContracts: many(rentalContracts),
	maintenanceRequests: many(maintenanceRequests),
	registrationRequests: many(registrationRequests),
}));

export const flatSlugsRelations = relations(flatSlugs, ({ one }) => ({
	flat: one(flats, {
		fields: [flatSlugs.flatId],
		references: [flats.id],
	}),
}));

export const managerAssignmentsRelations = relations(
	managerAssignments,
	({ one }) => ({
		owner: one(users, {
			fields: [managerAssignments.ownerAccountId],
			references: [users.id],
			relationName: "ownerManagerAssignments",
		}),
		manager: one(users, {
			fields: [managerAssignments.managerId],
			references: [users.id],
			relationName: "managerAssignments",
		}),
		building: one(buildings, {
			fields: [managerAssignments.buildingId],
			references: [buildings.id],
		}),
	}),
);

export const rentersRelations = relations(renters, ({ one, many }) => ({
	owner: one(users, {
		fields: [renters.ownerAccountId],
		references: [users.id],
		relationName: "ownerRenters",
	}),
	user: one(users, {
		fields: [renters.userId],
		references: [users.id],
		relationName: "renterUser",
	}),
	rentalContracts: many(rentalContracts),
	maintenanceRequests: many(maintenanceRequests),
}));

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
);

export const issuesRelations = relations(issues, ({ one, many }) => ({
	owner: one(users, {
		fields: [issues.ownerAccountId],
		references: [users.id],
		relationName: "ownerIssues",
	}),
	building: one(buildings, {
		fields: [issues.buildingId],
		references: [buildings.id],
	}),
	assignee: one(users, {
		fields: [issues.assigneeId],
		references: [users.id],
		relationName: "assignedIssues",
	}),
	attachments: many(issueAttachments),
}));

export const issueAttachmentsRelations = relations(
	issueAttachments,
	({ one }) => ({
		issue: one(issues, {
			fields: [issueAttachments.issueId],
			references: [issues.id],
		}),
	}),
);

export const noticesRelations = relations(notices, ({ one }) => ({
	owner: one(users, {
		fields: [notices.ownerAccountId],
		references: [users.id],
		relationName: "ownerNotices",
	}),
	author: one(users, {
		fields: [notices.authorId],
		references: [users.id],
		relationName: "authoredNotices",
	}),
	targetBuilding: one(buildings, {
		fields: [notices.targetBuildingId],
		references: [buildings.id],
	}),
	targetFlat: one(flats, {
		fields: [notices.targetFlatId],
		references: [flats.id],
	}),
}));

export const noticeTemplatesRelations = relations(
	noticeTemplates,
	({ one }) => ({
		owner: one(users, {
			fields: [noticeTemplates.ownerAccountId],
			references: [users.id],
			relationName: "ownerNoticeTemplates",
		}),
	}),
);

export const fileReferencesRelations = relations(fileReferences, ({ one }) => ({
	owner: one(users, {
		fields: [fileReferences.ownerAccountId],
		references: [users.id],
	}),
}));

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
);

export const maintenanceAttachmentsRelations = relations(
	maintenanceAttachments,
	({ one }) => ({
		request: one(maintenanceRequests, {
			fields: [maintenanceAttachments.requestId],
			references: [maintenanceRequests.id],
		}),
	}),
);

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
);

export const renterAccessCodesRelations = relations(
	renterAccessCodes,
	({ one }) => ({
		flat: one(flats, {
			fields: [renterAccessCodes.flatId],
			references: [flats.id],
		}),
		renter: one(renters, {
			fields: [renterAccessCodes.renterId],
			references: [renters.id],
		}),
	}),
);

export const emergencyContactsRelations = relations(
	emergencyContacts,
	({ one }) => ({
		building: one(buildings, {
			fields: [emergencyContacts.buildingId],
			references: [buildings.id],
		}),
		owner: one(users, {
			fields: [emergencyContacts.ownerAccountId],
			references: [users.id],
		}),
	}),
);

export const portalSessionsRelations = relations(portalSessions, ({ one }) => ({
	flat: one(flats, {
		fields: [portalSessions.flatId],
		references: [flats.id],
	}),
	renter: one(renters, {
		fields: [portalSessions.renterId],
		references: [renters.id],
	}),
}));

export const staffRolesRelations = relations(staffRoles, ({ one, many }) => ({
	owner: one(users, {
		fields: [staffRoles.ownerAccountId],
		references: [users.id],
		relationName: "ownerStaffRoles",
	}),
	rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
	rolePermissions: many(rolePermissions),
	userOverrides: many(userPermissionOverrides),
}));

export const rolePermissionsRelations = relations(
	rolePermissions,
	({ one }) => ({
		role: one(staffRoles, {
			fields: [rolePermissions.roleId],
			references: [staffRoles.id],
		}),
		permission: one(permissions, {
			fields: [rolePermissions.permissionId],
			references: [permissions.id],
		}),
	}),
);

export const userPermissionOverridesRelations = relations(
	userPermissionOverrides,
	({ one }) => ({
		user: one(users, {
			fields: [userPermissionOverrides.userId],
			references: [users.id],
			relationName: "userPermissionOverrides",
		}),
		permission: one(permissions, {
			fields: [userPermissionOverrides.permissionId],
			references: [permissions.id],
		}),
	}),
);

export const staffBuildingAssignmentsRelations = relations(
	staffBuildingAssignments,
	({ one }) => ({
		owner: one(users, {
			fields: [staffBuildingAssignments.ownerAccountId],
			references: [users.id],
			relationName: "ownerStaffAssignments",
		}),
		staff: one(users, {
			fields: [staffBuildingAssignments.staffId],
			references: [users.id],
			relationName: "staffBuildingAssignments",
		}),
		building: one(buildings, {
			fields: [staffBuildingAssignments.buildingId],
			references: [buildings.id],
		}),
	}),
);

export const registrationRequestsRelations = relations(
	registrationRequests,
	({ one }) => ({
		flat: one(flats, {
			fields: [registrationRequests.flatId],
			references: [flats.id],
		}),
		owner: one(users, {
			fields: [registrationRequests.ownerAccountId],
			references: [users.id],
		}),
	}),
);
