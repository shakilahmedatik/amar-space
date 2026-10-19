import { and, type Database, desc, ensureOrganizationHasOwner, eq, schema } from "@omniheaven/db";
import { ErrorCode, throwDomainError } from "@omniheaven/errors";
import type {
  AcceptInvitationInput,
  CreateOrganizationInput,
  InviteMemberInput,
  RemoveMemberInput,
  UpdateMemberRoleInput,
  UpdateOrganizationInput,
} from "@omniheaven/validators";
import { recordAuditLog } from "./audit.service";

export async function getActiveOrganization(db: Database, orgId: string, currentRole: string) {
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, orgId),
    with: {
      subscription: true,
      websiteConfig: true,
    },
  });

  if (!org) {
    throwDomainError(ErrorCode.ORG_NOT_FOUND, "Active organization not found");
  }

  return {
    ...org,
    currentRole,
  };
}

export async function getBySlug(db: Database, slug: string) {
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.slug, slug),
    with: {
      websiteConfig: true,
      roomTypes: true,
    },
  });

  if (!org) {
    throwDomainError(ErrorCode.ORG_NOT_FOUND, "Organization not found for slug");
  }

  return org;
}

export async function checkSlugAvailability(db: Database, slug: string) {
  const normalizedSlug = slug.toLowerCase().trim();
  const existing = await db.query.organizations.findFirst({
    where: eq(schema.organizations.slug, normalizedSlug),
  });

  return {
    available: !existing,
    slug: normalizedSlug,
  };
}

export async function listMyOrganizations(db: Database, userId: string) {
  const memberships = await db.query.members.findMany({
    where: eq(schema.members.userId, userId),
    with: {
      organization: {
        with: {
          subscription: true,
        },
      },
    },
    orderBy: [desc(schema.members.createdAt)],
  });

  return memberships.map((m) => ({
    ...m.organization,
    role: m.role,
    joinedAt: m.createdAt,
  }));
}

export async function createOrganization(
  db: Database,
  user: { id: string; email: string },
  input: CreateOrganizationInput,
) {
  const existing = await db.query.organizations.findFirst({
    where: eq(schema.organizations.slug, input.slug),
  });

  if (existing) {
    throwDomainError(ErrorCode.ORG_SLUG_TAKEN, "Requested organization slug is already in use");
  }

  const orgId = crypto.randomUUID();
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 180-day trial

  return await db.transaction(async (tx) => {
    const [newOrg] = await tx
      .insert(schema.organizations)
      .values({
        id: orgId,
        name: input.name,
        slug: input.slug,
        productType: input.productType,
        logo: input.logo,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        address: input.address,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await tx.insert(schema.members).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: user.id,
      role: "owner",
      createdAt: now,
    });

    await tx.insert(schema.subscriptions).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      plan: "trial_6_month",
      status: "trialing",
      trialStartsAt: now,
      trialEndsAt: trialEndsAt,
      paymentProvider: "paystation",
      createdAt: now,
      updatedAt: now,
    });

    await recordAuditLog({
      db: tx,
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: "ORGANIZATION_CREATED",
      entityType: "organization",
      entityId: orgId,
      details: { name: input.name, slug: input.slug, productType: input.productType },
    });

    return newOrg;
  });
}

export async function updateOrganization(
  db: Database,
  orgId: string,
  user: { id: string; email: string },
  input: UpdateOrganizationInput,
) {
  const now = new Date();

  const [updatedOrg] = await db
    .update(schema.organizations)
    .set({
      ...(input.name ? { name: input.name } : {}),
      ...(input.logo !== undefined ? { logo: input.logo } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.customDomain !== undefined ? { customDomain: input.customDomain } : {}),
      updatedAt: now,
    })
    .where(eq(schema.organizations.id, orgId))
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: user.id,
    actorEmail: user.email,
    action: "ORGANIZATION_UPDATED",
    entityType: "organization",
    entityId: orgId,
    details: input,
  });

  return updatedOrg;
}

export async function switchActiveOrganization(
  db: Database,
  userId: string,
  sessionId: string | undefined,
  targetOrgId: string,
) {
  const membership = await db.query.members.findFirst({
    where: and(eq(schema.members.organizationId, targetOrgId), eq(schema.members.userId, userId)),
    with: {
      organization: true,
    },
  });

  if (!membership) {
    throwDomainError(ErrorCode.ORG_FORBIDDEN, "User does not have access to this organization");
  }

  if (sessionId) {
    await db
      .update(schema.sessions)
      .set({ activeOrganizationId: targetOrgId, updatedAt: new Date() })
      .where(eq(schema.sessions.id, sessionId));
  }

  return {
    success: true,
    activeOrganization: membership.organization,
    role: membership.role,
  };
}

export async function listMembers(
  db: Database,
  orgId: string,
  pagination: { limit: number; offset: number },
) {
  const memberList = await db.query.members.findMany({
    where: eq(schema.members.organizationId, orgId),
    with: {
      user: true,
    },
    limit: pagination.limit,
    offset: pagination.offset,
    orderBy: [desc(schema.members.createdAt)],
  });

  return memberList.map((m) => ({
    id: m.id,
    role: m.role,
    createdAt: m.createdAt,
    user: {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
    },
  }));
}

export async function listInvitations(db: Database, orgId: string) {
  const invites = await db.query.invitations.findMany({
    where: eq(schema.invitations.organizationId, orgId),
    with: {
      inviter: true,
    },
    orderBy: [desc(schema.invitations.createdAt)],
  });

  return invites.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
    inviter: {
      id: inv.inviter.id,
      name: inv.inviter.name,
      email: inv.inviter.email,
    },
  }));
}

export async function inviteMember(
  db: Database,
  orgId: string,
  inviter: { id: string; email: string },
  input: InviteMemberInput,
) {
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.email, input.email),
  });

  if (existingUser) {
    const existingMember = await db.query.members.findFirst({
      where: and(
        eq(schema.members.organizationId, orgId),
        eq(schema.members.userId, existingUser.id),
      ),
    });

    if (existingMember) {
      throwDomainError(
        ErrorCode.MEMBER_ALREADY_EXISTS,
        "User is already a member of this organization",
      );
    }
  }

  const inviteId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);

  const [invitation] = await db
    .insert(schema.invitations)
    .values({
      id: inviteId,
      organizationId: orgId,
      email: input.email,
      role: input.role,
      status: "pending",
      expiresAt,
      inviterId: inviter.id,
      createdAt: new Date(),
    })
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: inviter.id,
    actorEmail: inviter.email,
    action: "MEMBER_INVITED",
    entityType: "invitation",
    entityId: inviteId,
    details: { email: input.email, role: input.role, expiresAt },
  });

  return invitation;
}

export async function acceptInvitation(
  db: Database,
  user: { id: string; email: string },
  input: AcceptInvitationInput,
) {
  const invitation = await db.query.invitations.findFirst({
    where: eq(schema.invitations.id, input.invitationId),
  });

  if (invitation?.status !== "pending") {
    throwDomainError(ErrorCode.INVITATION_EXPIRED, "Invitation not found or no longer active");
  }

  if (new Date() > invitation.expiresAt) {
    await db
      .update(schema.invitations)
      .set({ status: "canceled" })
      .where(eq(schema.invitations.id, invitation.id));

    throwDomainError(ErrorCode.INVITATION_EXPIRED);
  }

  return await db.transaction(async (tx) => {
    const existingMember = await tx.query.members.findFirst({
      where: and(
        eq(schema.members.organizationId, invitation.organizationId),
        eq(schema.members.userId, user.id),
      ),
    });

    if (!existingMember) {
      await tx.insert(schema.members).values({
        id: crypto.randomUUID(),
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
        createdAt: new Date(),
      });
    }

    await tx
      .update(schema.invitations)
      .set({ status: "accepted" })
      .where(eq(schema.invitations.id, invitation.id));

    await recordAuditLog({
      db: tx,
      organizationId: invitation.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: "INVITATION_ACCEPTED",
      entityType: "invitation",
      entityId: invitation.id,
      details: { role: invitation.role },
    });

    return {
      success: true,
      organizationId: invitation.organizationId,
    };
  });
}

export async function updateMemberRole(
  db: Database,
  orgId: string,
  actor: { id: string; email: string; role: string },
  input: UpdateMemberRoleInput,
) {
  const targetMember = await db.query.members.findFirst({
    where: and(eq(schema.members.id, input.memberId), eq(schema.members.organizationId, orgId)),
  });

  if (!targetMember) {
    throwDomainError(ErrorCode.MEMBER_NOT_FOUND, "Member not found in this organization");
  }

  if (actor.role === "admin" && (targetMember.role === "owner" || input.newRole === "owner")) {
    throwDomainError(ErrorCode.ORG_FORBIDDEN, "Admins cannot modify or assign the owner role");
  }

  if (targetMember.role === "owner" && input.newRole !== "owner") {
    await ensureOrganizationHasOwner(db, orgId, targetMember.userId);
  }

  const [updatedMember] = await db
    .update(schema.members)
    .set({ role: input.newRole })
    .where(eq(schema.members.id, input.memberId))
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MEMBER_ROLE_UPDATED",
    entityType: "member",
    entityId: input.memberId,
    details: { previousRole: targetMember.role, newRole: input.newRole },
  });

  return updatedMember;
}

export async function removeMember(
  db: Database,
  orgId: string,
  actor: { id: string; email: string; role: string },
  input: RemoveMemberInput,
) {
  const targetMember = await db.query.members.findFirst({
    where: and(eq(schema.members.id, input.memberId), eq(schema.members.organizationId, orgId)),
  });

  if (!targetMember) {
    throwDomainError(ErrorCode.MEMBER_NOT_FOUND, "Member not found in this organization");
  }

  if (actor.role === "admin" && targetMember.role === "owner") {
    throwDomainError(ErrorCode.ORG_FORBIDDEN, "Admins cannot remove an owner");
  }

  await ensureOrganizationHasOwner(db, orgId, targetMember.userId);

  await db.delete(schema.members).where(eq(schema.members.id, input.memberId));

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MEMBER_REMOVED",
    entityType: "member",
    entityId: input.memberId,
    details: { removedUserId: targetMember.userId, previousRole: targetMember.role },
  });

  return { success: true };
}
