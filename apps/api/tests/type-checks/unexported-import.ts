/**
 * Type-check verification: Importing unexported symbols from @repo/db
 *
 * This file verifies that the exports map in @repo/db/package.json correctly
 * restricts imports. Attempting to import from a path NOT listed in the
 * exports map (e.g., "@repo/db/seed") should produce a TypeScript compilation error.
 *
 * This file is intentionally NOT included in the main tsconfig.json (it's excluded
 * from the build). It's used only for manual verification that the exports map
 * enforcement works correctly.
 *
 * Expected behavior:
 * - `tsc --noEmit --project tsconfig.type-check.json` should FAIL on this file
 *   with an error like: "Cannot find module '@repo/db/seed' or its corresponding type declarations"
 */

// @ts-expect-error - This import should fail because "@repo/db/seed" is not in the exports map
import { seed } from '@repo/db/seed'

// If the above import doesn't error, this line would use the imported symbol
// to prevent "unused import" warnings from masking the real issue.
console.log(seed)
