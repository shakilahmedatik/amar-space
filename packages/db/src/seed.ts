import type { Database } from './client'
import { createDbClient } from './client'
import {
  accounts,
  buildings,
  flats,
  permissions,
  rentalContracts,
  renters,
  rolePermissions,
  staffRoles,
  users,
} from './schema'

type SeedTable =
  | typeof users
  | typeof accounts
  | typeof permissions
  | typeof rolePermissions
  | typeof staffRoles
  | typeof buildings
  | typeof flats
  | typeof renters
  | typeof rentalContracts

export interface SeedDb {
  query: {
    permissions: {
      findFirst(config: {
        where?: (
          p: Record<string, unknown>,
          ops: Record<string, (...args: unknown[]) => unknown>,
        ) => unknown
        columns?: unknown
      }): Promise<{ id: string; key: string } | null | undefined>
    }
    staffRoles: {
      findFirst(config: {
        where?: (
          sr: Record<string, unknown>,
          ops: Record<string, (...args: unknown[]) => unknown>,
        ) => unknown
      }): Promise<{ id: string; slug: string } | null | undefined>
    }
    buildings: {
      findFirst(config: {
        where?: (
          b: Record<string, unknown>,
          ops: Record<string, (...args: unknown[]) => unknown>,
        ) => unknown
      }): Promise<{ id: string } | null | undefined>
    }
    flats: {
      findFirst(config: {
        where?: (
          f: Record<string, unknown>,
          ops: Record<string, (...args: unknown[]) => unknown>,
        ) => unknown
      }): Promise<{ id: string } | null | undefined>
    }
    renters: {
      findFirst(config: {
        where?: (
          r: Record<string, unknown>,
          ops: Record<string, (...args: unknown[]) => unknown>,
        ) => unknown
      }): Promise<{ id: string } | null | undefined>
    }
    rentalContracts: {
      findFirst(config: {
        where?: (
          rc: Record<string, unknown>,
          ops: Record<string, (...args: unknown[]) => unknown>,
        ) => unknown
      }): Promise<{ id: string } | null | undefined>
    }
  }
  insert(table: SeedTable): {
    values(values: unknown): {
      onConflictDoNothing(config?: { target: unknown }): {
        returning(fields?: unknown): Promise<{ id: string; key: string }[]>
        then: (resolve: (value: unknown) => void) => Promise<unknown>
      }
      returning(fields?: unknown): Promise<{ id: string; key: string }[]>
      then: (resolve: (value: unknown) => void) => Promise<unknown>
    }
  }
}

const STAFF_ROLES_SEED = [
  {
    slug: 'manager',
    name: 'Manager',
    description:
      'Manages buildings, flats, renters, billing and day-to-day operations',
    permissions: [
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
    ],
  },
  {
    slug: 'security_guard',
    name: 'Security Guard',
    description: 'Monitors building issues and security concerns',
    permissions: [
      'buildings:read',
      'flats:read',
      'maintenance:read',
      'maintenance:write',
      'issues:read',
      'issues:write',
      'notices:read',
    ],
  },
  {
    slug: 'care_taker',
    name: 'Care Taker',
    description: 'Handles maintenance requests and building upkeep',
    permissions: [
      'buildings:read',
      'flats:read',
      'maintenance:read',
      'maintenance:write',
      'issues:read',
      'issues:write',
      'notices:read',
    ],
  },
]

const ALL_PERMISSIONS = [
  { key: 'buildings:read', label: 'View Buildings', group: 'buildings' },
  {
    key: 'buildings:write',
    label: 'Create/Edit Buildings',
    group: 'buildings',
  },
  { key: 'flats:read', label: 'View Flats', group: 'flats' },
  { key: 'flats:write', label: 'Create/Edit Flats', group: 'flats' },
  { key: 'flats:delete', label: 'Delete Flats', group: 'flats' },
  { key: 'renters:read', label: 'View Renters', group: 'renters' },
  { key: 'renters:write', label: 'Create/Edit Renters', group: 'renters' },
  { key: 'bills:read', label: 'View Bills', group: 'bills' },
  { key: 'bills:write', label: 'Create/Edit Bills', group: 'bills' },
  { key: 'payments:read', label: 'View Payments', group: 'payments' },
  { key: 'payments:write', label: 'Record Payments', group: 'payments' },
  { key: 'deposits:read', label: 'View Deposits', group: 'deposits' },
  { key: 'deposits:write', label: 'Manage Deposits', group: 'deposits' },
  {
    key: 'maintenance:read',
    label: 'View Maintenance',
    group: 'maintenance',
  },
  {
    key: 'maintenance:write',
    label: 'Manage Maintenance',
    group: 'maintenance',
  },
  { key: 'issues:read', label: 'View Issues', group: 'issues' },
  { key: 'issues:write', label: 'Manage Issues', group: 'issues' },
  { key: 'notices:read', label: 'View Notices', group: 'notices' },
  { key: 'notices:write', label: 'Create Notices', group: 'notices' },
  { key: 'notices:delete', label: 'Delete Notices', group: 'notices' },
  { key: 'audit:read', label: 'View Audit Log', group: 'audit' },
  { key: 'roles:write', label: 'Manage Roles', group: 'roles' },
  { key: 'staff:read', label: 'View Staff', group: 'staff' },
  { key: 'staff:write', label: 'Manage Staff', group: 'staff' },
]

export async function seed(db: Database): Promise<void> {
  console.log('[seed] Seeding database with development data...')

  const now = new Date()

  // Better Auth scrypt hash for "Password123!"
  const hashedPassword =
    'd5f372efeb9b775cc0143ca87f09dfbd:00678f13652439d3a00a3a443f438af73b30667c9f2ce75d499f296e34eec796f1c5c76aac74212f68f77158b05675c1d320e1bd540bc57642d9871e21371d42'

  // 1. Seed permissions
  const permKeyToId = new Map<string, string>()
  for (const perm of ALL_PERMISSIONS) {
    const result = await db
      .insert(permissions)
      .values({
        key: perm.key,
        label: perm.label,
        group: perm.group,
      })
      .onConflictDoNothing({ target: permissions.key })
      .returning({ id: permissions.id, key: permissions.key })

    if (result.length > 0) {
      permKeyToId.set(result[0]!.key, result[0]!.id)
    } else {
      const existing = await db.query.permissions.findFirst({
        where: (p, { eq }) => eq(p.key, perm.key),
        columns: { id: true, key: true },
      })
      if (existing) {
        permKeyToId.set(existing.key, existing.id)
      }
    }
  }

  // 2. Seed system roles
  for (const role of STAFF_ROLES_SEED) {
    const existingRole = await db.query.staffRoles.findFirst({
      where: (sr, { and, eq, isNull }) =>
        and(eq(sr.slug, role.slug), isNull(sr.ownerAccountId)),
    })

    let roleId: string

    if (existingRole) {
      roleId = existingRole.id
    } else {
      const inserted = await db
        .insert(staffRoles)
        .values({
          ownerAccountId: null,
          name: role.name,
          slug: role.slug,
          description: role.description,
          isSystemRole: true,
        })
        .returning({ id: staffRoles.id })

      roleId = inserted[0]!.id
    }

    for (const permKey of role.permissions) {
      const permId = permKeyToId.get(permKey)
      if (!permId) {
        console.warn(`[seed] Permission key "${permKey}" not found, skipping`)
        continue
      }

      await db
        .insert(rolePermissions)
        .values({
          roleId,
          permissionId: permId,
        })
        .onConflictDoNothing()
    }
  }

  // IDs for user accounts
  const superadminId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'
  const ownerId = 'd0c5a210-9b37-4d92-bb8a-986c757c9172'
  const managerId = 'f9e8d7c6-b5a4-3210-fe12-34567890abcd'
  const guardId = 'c8d7c6b5-a432-10fe-1234-567890abcdef'
  const caretakerId = 'b8d7c6b5-a432-10fe-1234-567890abcdef'
  const tenantId = 'e8d7c6b5-a432-10fe-1234-567890abcdef'

  const demoUsers = [
    {
      id: superadminId,
      email: 'admin@amarspace.local',
      name: 'Super Admin',
      role: 'superadmin',
      ownerAccountId: null,
    },
    {
      id: ownerId,
      email: 'owner@amarspace.local',
      name: 'Property Owner',
      role: 'owner',
      ownerAccountId: null,
    },
    {
      id: managerId,
      email: 'manager@amarspace.local',
      name: 'Property Manager',
      role: 'manager',
      ownerAccountId: ownerId,
    },
    {
      id: guardId,
      email: 'guard@amarspace.local',
      name: 'Security Guard',
      role: 'security_guard',
      ownerAccountId: ownerId,
    },
    {
      id: caretakerId,
      email: 'caretaker@amarspace.local',
      name: 'Care Taker',
      role: 'care_taker',
      ownerAccountId: ownerId,
    },
    {
      id: tenantId,
      email: 'tenant@amarspace.local',
      name: 'Tenant User',
      role: 'renter',
      ownerAccountId: ownerId,
    },
  ]

  // 3. Seed users
  for (const user of demoUsers) {
    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: true,
        role: user.role,
        ownerAccountId: user.ownerAccountId,
        approvalStatus: 'approved',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: users.email })

    // 4. Seed Better Auth credentials account
    await db
      .insert(accounts)
      .values({
        id: `account-${user.id}`,
        accountId: user.email,
        providerId: 'credential',
        userId: user.id,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: accounts.id })
  }

  // 5. Seed Building
  const buildingId = '11111111-1111-1111-1111-111111111111'
  const existingBuilding = await db.query.buildings.findFirst({
    where: (b, { eq }) => eq(b.id, buildingId),
  })
  if (!existingBuilding) {
    await db.insert(buildings).values({
      id: buildingId,
      ownerAccountId: ownerId,
      name: 'Rose Valley Apartment',
      address: '123 Green Road, Dhaka',
      totalFloors: 6,
      createdAt: now,
      updatedAt: now,
    })
  }

  // 6. Seed Flat
  const flatId = '22222222-2222-2222-2222-222222222222'
  const existingFlat = await db.query.flats.findFirst({
    where: (f, { eq }) => eq(f.id, flatId),
  })
  if (!existingFlat) {
    await db.insert(flats).values({
      id: flatId,
      ownerAccountId: ownerId,
      buildingId: buildingId,
      flatNumber: 'A-1',
      floor: 1,
      status: 'occupied',
      createdAt: now,
      updatedAt: now,
    })
  }

  // 7. Seed Renter Profile
  const renterId = '33333333-3333-3333-3333-333333333333'
  const existingRenter = await db.query.renters.findFirst({
    where: (r, { eq }) => eq(r.id, renterId),
  })
  if (!existingRenter) {
    await db.insert(renters).values({
      id: renterId,
      ownerAccountId: ownerId,
      userId: tenantId,
      fullName: 'Tenant User',
      phone: '01712345678',
      nidNumber: '12345678901234567',
      occupation: 'Software Engineer',
      bloodGroup: 'O+',
      totalFamilyMembers: 2,
      emergencyContactName: 'Emergency Contact',
      emergencyContactNumber: '01787654321',
      emergencyContactRelationship: 'Spouse',
      createdAt: now,
      updatedAt: now,
    })
  }

  // 8. Seed Rental Contract
  const contractId = '44444444-4444-4444-4444-444444444444'
  const existingContract = await db.query.rentalContracts.findFirst({
    where: (rc, { eq }) => eq(rc.id, contractId),
  })
  if (!existingContract) {
    await db.insert(rentalContracts).values({
      id: contractId,
      ownerAccountId: ownerId,
      renterId: renterId,
      flatId: flatId,
      monthlyRent: '15000.00',
      startDate: '2026-01-01',
      securityDepositAmount: '30000.00',
      remainingDepositBalance: '30000.00',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
  }

  console.log('[seed] Database seeded successfully.')
}

// Main execution block
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('seed.ts')
) {
  const db = createDbClient()
  seed(db)
    .then(() => {
      console.log('[seed] Done.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[seed] Seed failed:', error)
      process.exit(1)
    })
}
