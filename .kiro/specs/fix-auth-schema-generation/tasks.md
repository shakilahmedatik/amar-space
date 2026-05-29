# Implementation Plan: fix-auth-schema-generation

## Overview

Replace the four manually-written Better Auth schema files with versions that match Better Auth 1.6.11's canonical field definitions (text IDs, correct column types), preserve app-specific user fields, generate a new Drizzle migration, apply it, and verify the TypeScript build is clean.

## Tasks

- [x] 1. Rewrite `packages/db/src/schema/users.ts`
  - Replace `uuid('id').primaryKey().defaultRandom()` with `text('id').primaryKey()`
  - Change `email`, `name`, `image` columns from `varchar` to `text`
  - Remove `defaultNow()` from `createdAt` and `updatedAt` (Better Auth sets these itself; Drizzle should not add a DB-level default that conflicts)
  - Retain the four app-specific fields unchanged: `role` (varchar 20, default `'owner'`), `ownerAccountId` (uuid, nullable), `phone` (varchar 20, nullable), `languagePreference` (varchar 5, default `'bn'`)
  - Update imports: add `text`, remove `uuid` from the `drizzle-orm/pg-core` import (keep `uuid` only for `ownerAccountId`)
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Rewrite `packages/db/src/schema/sessions.ts`
  - Replace `uuid('id').primaryKey().defaultRandom()` with `text('id').primaryKey()`
  - Change `userId` FK column from `uuid(...)` to `text(...)`
  - Change `token`, `ipAddress`, `userAgent` columns from `varchar` to `text`
  - Remove `defaultNow()` from `createdAt` and `updatedAt`
  - Update imports: use only `pgTable`, `text`, `timestamp` from `drizzle-orm/pg-core`
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Rewrite `packages/db/src/schema/accounts.ts`
  - Replace `uuid('id').primaryKey().defaultRandom()` with `text('id').primaryKey()`
  - Change `userId` FK column from `uuid(...)` to `text(...)`
  - Change `accountId`, `providerId`, `scope` columns from `varchar` to `text`
  - Remove `defaultNow()` from `createdAt` and `updatedAt`
  - Update imports: use only `pgTable`, `text`, `timestamp` from `drizzle-orm/pg-core`
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Rewrite `packages/db/src/schema/verifications.ts`
  - Replace `uuid('id').primaryKey().defaultRandom()` with `text('id').primaryKey()`
  - Change `identifier` column from `varchar` to `text`
  - Make `createdAt` and `updatedAt` nullable (remove `.notNull()`) to match Better Auth's canonical schema
  - Remove `defaultNow()` from `createdAt` and `updatedAt`
  - Update imports: use only `pgTable`, `text`, `timestamp` from `drizzle-orm/pg-core`
  - _Requirements: 5.1, 5.2_

- [x] 5. Verify `schema/index.ts` and `schema/relations.ts` require no changes
  - Confirm `schema/index.ts` already exports all four tables — no edits needed
  - Confirm `relations.ts` references only `users.ownerAccountId` and `users.id`, both of which are preserved — no edits needed
  - If any other file in `packages/db/src/` or `apps/api/src/` references a column that was removed or renamed, update that file
  - _Requirements: 2.4, 2.5, 6.1, 6.2, 6.3, 6.4_

- [x] 6. Checkpoint — verify TypeScript compiles before running migrations
  - Run `bun run check-types` from `packages/db`
  - Fix any type errors before proceeding to migration steps
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 7. Generate the Drizzle migration
  - Run `bun run db:generate` from `packages/db`
  - Inspect the generated SQL file in `packages/db/migrations/` to confirm it reflects the expected column type changes (uuid→text for id columns, varchar→text for string columns, nullability changes on verifications)
  - If the migration is empty, verify that `drizzle.config.ts` reads from `./src/schema/index.ts` and that all four files are exported
  - _Requirements: 7.1, 7.3_

- [x] 8. Apply the migration
  - Run `bun run db:migrate` from `packages/db`
  - If the command fails due to a type conflict, inspect the generated SQL and add explicit `USING column::text` casts where needed, then re-run
  - _Requirements: 7.2, 7.4, 7.5_

- [x] 9. Final checkpoint — confirm build and schema are clean
  - Run `bun run check-types` from `packages/db` one final time to confirm zero errors
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 8.1, 8.2_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2", "3", "4"] },
    { "wave": 2, "tasks": ["5"] },
    { "wave": 3, "tasks": ["6"] },
    { "wave": 4, "tasks": ["7"] },
    { "wave": 5, "tasks": ["8"] },
    { "wave": 6, "tasks": ["9"] }
  ]
}
```

## Notes

- Tasks 1–4 are the core rewrites and should be done together before running any migration commands.
- Task 6 (type check before migration) is a safety gate — do not proceed to task 7 if there are type errors.
- The `defaultNow()` removal from `createdAt`/`updatedAt` is intentional: Better Auth sets these values itself when creating records. Keeping a DB-level default is harmless but can cause Drizzle to generate unnecessary migration diffs on future runs.
- The `ownerAccountId` column on `users` stays as `uuid` (not `text`) because it is an app-specific field referencing other app tables, not a Better Auth field.
- No changes are needed to `login-attempts.ts` or any other domain schema file.
