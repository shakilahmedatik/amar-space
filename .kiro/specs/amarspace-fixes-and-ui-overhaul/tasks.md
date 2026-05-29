# Implementation Plan: AmarSpace Fixes & UI Overhaul

## Overview

Seven concrete fixes and improvements implemented in dependency order: monorepo cleanup first, then backend fixes (port binding + CORS), then frontend tooling (Tailwind v4 + shadcn/ui), then design token wiring, then the full inline-style migration, and finally the env file. Each task builds on the previous so no step leaves orphaned code.

## Tasks

- [x] 1. Remove apps/docs from the monorepo
  - [x] 1.1 Delete the apps/docs directory and clean up workspace references
    - Delete the entire `apps/docs/` directory tree
    - Remove any `apps/docs` reference from the root `package.json` workspaces array (currently `"apps/*"` glob covers it — verify no explicit entry exists)
    - Scan `turbo.json` for any pipeline task or dependency referencing the `docs` package and remove it
    - Grep all files in `apps/web`, `apps/api`, and `packages/*` for any string `apps/docs` (imports, comments, string literals) and remove or replace each occurrence
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Add local dev port binding to the API server
  - [x] 2.1 Modify apps/api/src/index.ts to call app.listen() in non-production environments
    - After the existing Vercel `export default async function handler(...)` export in `apps/api/src/index.ts`, add a conditional block: `if (process.env.NODE_ENV !== 'production') { ... }`
    - Inside the block, read `const port = Number(process.env.PORT ?? 3001)` and call `app.listen({ port, host: '0.0.0.0' }, (err) => { if (err) { app.log.error(err); process.exit(1) } app.log.info(\`API listening on http://localhost:\${port}\`) })`
    - The Vercel handler export must remain unconditional — always present regardless of `NODE_ENV`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Make CORS configuration environment-aware
  - [x] 3.1 Replace the static CORS origin in apps/api/src/app.ts with an environment-aware callback
    - In `apps/api/src/app.ts`, replace the current `app.register(fastifyCors, { origin: true, credentials: true })` call
    - Use an `origin` callback function: read `process.env.NODE_ENV`; in `'development'` mode, build `allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']`; in production, build `allowedOrigins = [process.env.ALLOWED_ORIGIN ?? '']`
    - If `!origin || allowedOrigins.includes(origin)` call `cb(null, true)`; otherwise call `cb(new Error('Not allowed by CORS'), false)`
    - Keep `credentials: true` on the registration options
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Write property test for CORS origin resolver
    - **Property 5: CORS allows localhost only in development**
    - Use `fast-check` (already in `apps/api` devDependencies) to generate arbitrary origin strings
    - Assert: for any origin not in `['http://localhost:3000', 'http://127.0.0.1:3000']`, the callback is called with an error when `NODE_ENV === 'development'`
    - Assert: for any origin matching `http://localhost:3000`, the callback is called with `(null, true)` in development
    - Assert: in production, only `ALLOWED_ORIGIN` value is permitted; all others are rejected
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6**

- [x] 4. Checkpoint — API fixes complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Install Tailwind v4 and shadcn/ui nova preset in apps/web
  - [x] 5.1 Add Tailwind v4 and PostCSS dependencies to apps/web/package.json
    - Add `tailwindcss` (v4 / `@next` tag), `@tailwindcss/postcss` (v4 / `@next` tag), and `postcss` to `apps/web/package.json` dependencies
    - Run `bun install` from the monorepo root to update the lockfile
    - _Requirements: 4.1_

  - [x] 5.2 Create apps/web/postcss.config.mjs
    - Create `apps/web/postcss.config.mjs` with content:
      ```js
      export default {
        plugins: {
          '@tailwindcss/postcss': {},
        },
      }
      ```
    - _Requirements: 4.2_

  - [x] 5.3 Run shadcn init to scaffold components.json and base UI components
    - Run `bunx shadcn@latest init --preset nova` from `apps/web` (or pass `--cwd apps/web` from root)
    - Accept prompts: style = nova, RSC = yes, TSX = yes, CSS variables = yes, CSS file = `app/globals.css`, aliases matching existing `@/components`, `@/lib`, `@/hooks`
    - Verify `apps/web/components.json` is created with `"style": "nova"`, `"rsc": true`, `"tsx": true`, `"cssVariables": true`
    - Verify `apps/web/components/ui/` now contains shadcn base files (button.tsx, badge.tsx, card.tsx, input.tsx, label.tsx, skeleton.tsx, alert-dialog.tsx, table.tsx, alert.tsx)
    - _Requirements: 4.3, 4.4_

  - [x] 5.4 Verify apps/web builds successfully with Tailwind v4 and shadcn installed
    - Run `bun run build` in `apps/web` (or `turbo run build --filter=web`)
    - Fix any TypeScript errors, missing import errors, PostCSS configuration errors, or Tailwind directive errors that surface
    - _Requirements: 4.5_

- [x] 6. Wire DESIGN.md tokens into the Tailwind @theme block in globals.css
  - [x] 6.1 Rewrite apps/web/app/globals.css with @import and full @theme block
    - Replace the entire contents of `apps/web/app/globals.css` with a new file that starts with `@import "tailwindcss";`
    - Add an `@theme { ... }` block containing all tokens from DESIGN.md in the exact order and values specified in the design document:
      - Font families: `--font-sans: "DM Sans", "Noto Sans Bengali", Inter, system-ui, sans-serif;` and `--font-mono: ui-monospace, monospace;`
      - All brand colors: `--color-primary`, `--color-on-primary`, `--color-primary-soft`, `--color-brand-green`, `--color-brand-green-light`, `--color-brand-blue`, `--color-brand-blue-mid`, `--color-brand-blue-deep`, `--color-brand-blue-200`, `--color-brand-orange`, `--color-brand-orange-light`
      - Surface & canvas colors: `--color-canvas`, `--color-surface`, `--color-surface-soft`, `--color-hairline`, `--color-hairline-soft`
      - Text hierarchy colors: `--color-ink`, `--color-ink-strong`, `--color-charcoal`, `--color-slate`, `--color-steel`, `--color-stone`, `--color-muted`
      - Semantic colors: `--color-success-bg`, `--color-success-text`, `--color-warning-bg`, `--color-warning-text`, `--color-error-bg`, `--color-error-text`, `--color-on-dark`, `--color-footer-bg`
      - Border radius tokens with exact values: `--radius-xs: 4px`, `--radius-sm: 6px`, `--radius-md: 8px`, `--radius-lg: 12px`, `--radius-xl: 16px`, `--radius-xxl: 20px`, `--radius-xxxl: 24px`, `--radius-full: 9999px`
      - Spacing tokens: `--spacing-xxs: 4px` through `--spacing-section-lg: 80px` (all 11 tokens)
    - Preserve the `html, body` base styles and `*` box-sizing reset after the `@theme` block
    - Update `apps/web/app/layout.tsx` to load DM Sans from Google Fonts (replace GeistVF with DM Sans) and keep Noto Sans Bengali; update the `--font-sans` variable reference to use the new font variables
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 7. Migrate shared UI primitives to shadcn components
  - [x] 7.1 Migrate components/ui/status-badge.tsx to use shadcn Badge
    - Replace the existing `<StatusBadge>` implementation with one that wraps shadcn `<Badge>`
    - Map each status variant (active/success, pending/warning, overdue/error, info, neutral) to the corresponding Tailwind token classes: `bg-success-bg text-success-text`, `bg-warning-bg text-warning-text`, `bg-error-bg text-error-text`, `bg-brand-blue-200 text-brand-blue-deep`, `bg-surface text-steel`
    - Apply `rounded-full px-[10px] py-1` to every variant (pill shape system signature)
    - Remove all `style={{}}` props and raw hex literals
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 7.2 Migrate components/ui/form-field.tsx to use shadcn Input and Label
    - Replace `<FormInput>` with shadcn `<Input>` (keep the `ref` forwarding and `hasError` prop for error state styling)
    - Replace the label element with shadcn `<Label>`
    - Apply error state via `className` using `border-error-text bg-error-bg` when `hasError` is true
    - Apply `rounded-md border-hairline min-h-[44px]` to the input for DESIGN.md compliance
    - Remove all `style={{}}` props and raw hex literals
    - _Requirements: 6.1, 6.2, 6.6, 6.10_

  - [x] 7.3 Migrate components/ui/loading-skeleton.tsx to use shadcn Skeleton
    - Replace the existing skeleton implementation with shadcn `<Skeleton>`
    - Use `bg-surface` for the skeleton background color (token class, not inline style)
    - Remove all `style={{}}` props
    - _Requirements: 6.1, 6.2, 6.7_

  - [x] 7.4 Migrate components/ui/confirm-dialog.tsx to use shadcn AlertDialog
    - Replace the existing confirm dialog implementation with shadcn `<AlertDialog>`, `<AlertDialogContent>`, `<AlertDialogHeader>`, `<AlertDialogFooter>`, `<AlertDialogTitle>`, `<AlertDialogDescription>`, `<AlertDialogAction>`, `<AlertDialogCancel>`
    - Apply `rounded-full` to action and cancel buttons (pill shape)
    - Apply `bg-error-text text-on-dark rounded-full` to destructive action button
    - Remove all `style={{}}` props and raw hex literals
    - _Requirements: 6.1, 6.2, 6.8_

  - [x] 7.5 Migrate components/ui/data-table.tsx to use shadcn Table
    - Replace the existing data table implementation with shadcn `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableHead>`, `<TableCell>`
    - Apply `bg-surface text-steel` to header rows; `bg-canvas text-ink` to body rows
    - Apply `min-h-[48px]` to table rows (DESIGN.md 48px row height)
    - Apply `rounded-lg border border-hairline` to the table container
    - Remove all `style={{}}` props and raw hex literals
    - _Requirements: 6.1, 6.2, 6.9_

  - [x] 7.6 Migrate components/ui/error-feedback.tsx to use shadcn Alert
    - Replace the existing error feedback implementation with shadcn `<Alert>` and `<AlertDescription>`
    - Apply `bg-error-bg text-error-text rounded-lg` for error variant; `bg-warning-bg text-warning-text rounded-lg` for warning variant
    - Remove all `style={{}}` props and raw hex literals
    - _Requirements: 6.1, 6.2_

  - [x] 7.7 Migrate components/ui/file-upload.tsx to Tailwind classes
    - Replace all `style={{}}` props with Tailwind token classes
    - Apply `border-hairline rounded-md bg-surface` to the drop zone
    - Apply `text-brand-blue-deep` to the upload link/button text
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2_

  - [x] 7.8 Migrate components/ui/currency-display.tsx and date-display.tsx to Tailwind classes
    - Replace all `style={{}}` props with Tailwind token classes in both files
    - Use `text-ink font-semibold` for currency amounts; `text-steel text-sm` for dates
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2_

- [x] 8. Migrate layout components to Tailwind classes and shadcn
  - [x] 8.1 Migrate components/layout/auth-layout.tsx to Tailwind classes
    - Replace all `style={{}}` props with Tailwind token classes
    - Apply `bg-surface min-h-dvh flex items-center justify-center` to the outer container
    - Apply `bg-canvas rounded-xl border border-hairline p-xl shadow-sm` to the card container
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 Migrate components/layout/sidebar.tsx to Tailwind token classes
    - Replace any remaining `style={{}}` props with Tailwind token classes (sidebar already uses Tailwind but may have inline styles)
    - Replace `bg-blue-50 text-blue-700` active state with `bg-surface text-ink` (DESIGN.md sidebar-nav-item-active tokens)
    - Replace `text-gray-700 hover:bg-gray-100 hover:text-gray-900` with `text-charcoal hover:bg-surface hover:text-ink`
    - Replace `border-gray-200 bg-white` with `border-hairline bg-canvas`
    - Ensure all nav items have `min-h-[44px]` (already present as `min-h-11` — verify equivalence)
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.10_

  - [x] 8.3 Migrate components/layout/bottom-tab-bar.tsx to Tailwind token classes
    - Replace all `style={{}}` props with Tailwind token classes
    - Apply `bg-canvas border-t border-hairline-soft h-16` to the bottom bar container
    - Apply `text-brand-green` to active items; `text-stone` to inactive items
    - Ensure each tab item has `min-h-[44px]` touch target
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.10_

  - [x] 8.4 Migrate components/layout/dashboard-layout.tsx to Tailwind token classes
    - Replace all `style={{}}` props with Tailwind token classes
    - Apply `bg-surface min-h-dvh` to the root layout container
    - Apply `bg-canvas border-b border-hairline-soft h-16` to the top nav bar
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2_

- [x] 9. Migrate auth pages to shadcn Button and Tailwind classes
  - [x] 9.1 Migrate app/(auth)/login/page.tsx to shadcn Button and Tailwind classes
    - Replace the submit `<button>` with shadcn `<Button>` with `className="w-full min-h-[44px] rounded-full bg-primary text-on-primary font-semibold"`
    - Replace the `<h2 style={{...}}>` with `<h2 className="text-xl font-semibold mb-6 text-center text-ink">`
    - Replace the `<p style={{...}}>` footer paragraph with `<p className="mt-6 text-center text-sm text-steel">`
    - Replace the `<a style={{...}}>` register link with `<a className="text-brand-blue-deep font-medium underline">`
    - Remove all `style={{}}` props and raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.10_

  - [x] 9.2 Migrate app/(auth)/register/page.tsx to shadcn Button and Tailwind classes
    - Apply the same migration pattern as login/page.tsx
    - Replace all submit buttons with shadcn `<Button className="w-full min-h-[44px] rounded-full">`
    - Replace all `style={{}}` props with Tailwind token classes
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.10_

- [x] 10. Migrate dashboard pages to shadcn Card and Tailwind classes
  - [x] 10.1 Migrate app/dashboard/owner-dashboard.tsx to shadcn Card and Tailwind classes
    - Replace all card `<div style={{...}}>` wrappers with shadcn `<Card>` and `<CardContent>`
    - Apply `bg-surface rounded-lg p-lg` to stat cards (card-stat pattern from DESIGN.md)
    - Apply `bg-canvas rounded-xl border border-hairline p-xl` to content cards (card-base pattern)
    - Replace all action buttons with shadcn `<Button className="rounded-full min-h-[44px]">`
    - Replace all status indicators with migrated `<StatusBadge>` (which now uses shadcn Badge)
    - Remove all `style={{}}` props and raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 10.2 Migrate app/dashboard/manager-dashboard.tsx to shadcn Card and Tailwind classes
    - Apply the same migration pattern as owner-dashboard.tsx
    - Replace all card surfaces with shadcn `<Card>` / `<CardContent>`
    - Replace all buttons with shadcn `<Button className="rounded-full min-h-[44px]">`
    - Remove all `style={{}}` props and raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 10.3 Migrate app/dashboard/renter-dashboard.tsx to shadcn Card and Tailwind classes
    - Apply the same migration pattern as owner-dashboard.tsx
    - Replace all card surfaces with shadcn `<Card>` / `<CardContent>`
    - Replace all buttons with shadcn `<Button className="rounded-full min-h-[44px]">`
    - Remove all `style={{}}` props and raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 10.4 Migrate app/dashboard/page.tsx to Tailwind classes
    - Replace the `<h1 style={{...}}>` with `<h1 className="text-2xl font-bold mb-6 text-ink">`
    - Replace `bg-gray-50` with `bg-surface` in the loading state container
    - Remove all `style={{}}` props and raw hex literals
    - _Requirements: 6.1, 6.2_

- [x] 11. Migrate feature pages to Tailwind classes and shadcn components
  - [x] 11.1 Migrate app/buildings/ pages (page.tsx, [id]/page.tsx, new/page.tsx) to Tailwind and shadcn
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace card surfaces with shadcn `<Card>` / `<CardContent>`
    - Replace buttons with shadcn `<Button className="rounded-full min-h-[44px]">`
    - Replace status indicators with `<StatusBadge>` (now using shadcn Badge)
    - Replace data tables with migrated `<DataTable>` (now using shadcn Table)
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.9_

  - [x] 11.2 Migrate app/flats/ pages (page.tsx, [id]/page.tsx, new/page.tsx) to Tailwind and shadcn
    - Apply the same migration pattern as buildings pages
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace card surfaces, buttons, status badges, and data tables with shadcn primitives
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.9_

  - [x] 11.3 Migrate app/renters/ pages (page.tsx, [id]/page.tsx, new/page.tsx) to Tailwind and shadcn
    - Apply the same migration pattern as buildings pages
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace card surfaces, buttons, status badges, and data tables with shadcn primitives
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.9_

  - [x] 11.4 Migrate app/bills/ pages (page.tsx, [id]/page.tsx) to Tailwind and shadcn
    - Apply the same migration pattern as buildings pages
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace card surfaces, buttons, status badges, and data tables with shadcn primitives
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.9_

  - [x] 11.5 Migrate app/payments/ pages (page.tsx, [id]/page.tsx, new/page.tsx) to Tailwind and shadcn
    - Apply the same migration pattern as buildings pages
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace card surfaces, buttons, status badges, and data tables with shadcn primitives
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.9_

  - [x] 11.6 Migrate app/maintenance/ pages (page.tsx, [id]/page.tsx, new/page.tsx) to Tailwind and shadcn
    - Apply the same migration pattern as buildings pages
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace card surfaces, buttons, status badges, and data tables with shadcn primitives
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.9_

  - [x] 11.7 Migrate app/issues/ pages (page.tsx, [id]/page.tsx, new/page.tsx) to Tailwind and shadcn
    - Apply the same migration pattern as buildings pages
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace card surfaces, buttons, status badges, and data tables with shadcn primitives
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.9_

  - [x] 11.8 Migrate app/notices/ pages (page.tsx, [id]/page.tsx, new/page.tsx) to Tailwind and shadcn
    - Apply the same migration pattern as buildings pages
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace card surfaces, buttons, status badges, and data tables with shadcn primitives
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.9_

  - [x] 11.9 Migrate app/audit/page.tsx to Tailwind and shadcn
    - Apply the same migration pattern as buildings pages
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace data table with migrated `<DataTable>` (shadcn Table)
    - Replace filter buttons with shadcn `<Button variant="outline" className="rounded-full">`
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.9_

  - [x] 11.10 Migrate app/settings/page.tsx to Tailwind and shadcn
    - Apply the same migration pattern as buildings pages
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace card surfaces with shadcn `<Card>` / `<CardContent>`
    - Replace form inputs with migrated `<FormField>` / `<FormInput>` (shadcn Input + Label)
    - Replace buttons with shadcn `<Button className="rounded-full min-h-[44px]">`
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

- [x] 12. Migrate deposit components to Tailwind classes and shadcn
  - [x] 12.1 Migrate components/deposits/deposit-balance-card.tsx to shadcn Card and Tailwind classes
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace the card surface with shadcn `<Card>` / `<CardContent className="p-lg">`
    - Apply `bg-surface rounded-lg border border-hairline` to the card
    - Apply `text-ink font-bold` to the balance amount; `text-steel text-sm` to labels
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.5_

  - [x] 12.2 Migrate components/deposits/deposit-adjustment-form.tsx to shadcn and Tailwind classes
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace form inputs with migrated `<FormField>` / `<FormInput>` (shadcn Input + Label)
    - Replace submit button with shadcn `<Button className="rounded-full min-h-[44px]">`
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.3, 6.6, 6.10_

  - [x] 12.3 Migrate components/deposits/deposit-adjustment-history.tsx to shadcn Table and Tailwind classes
    - Replace all `style={{}}` props with Tailwind token classes
    - Replace the history list/table with migrated `<DataTable>` (shadcn Table)
    - Replace status indicators with `<StatusBadge>` (shadcn Badge)
    - Remove all raw hex literals
    - _Requirements: 6.1, 6.2, 6.4, 6.9_

- [x] 13. Checkpoint — UI migration complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Run property-based and unit tests for migration correctness
  - [x] 14.1 Write property test: no inline styles remain after migration
    - **Property 1: No inline styles remain after migration**
    - Write a Node.js/Bun test script that uses `fast-check` to generate file paths from `apps/web/components/**/*.tsx` and `apps/web/app/**/*.tsx`
    - For each file, assert that the source text contains zero occurrences of the `style={{` pattern
    - **Validates: Requirements 6.1**

  - [x] 14.2 Write property test: no raw hex literals outside globals.css
    - **Property 2: No raw hex literals outside globals.css**
    - Write a test that scans all TSX files in `apps/web/components/**/*.tsx` and `apps/web/app/**/*.tsx`
    - Assert that no file contains a raw hex literal matching `#[0-9a-fA-F]{3,6}` (excluding `globals.css`)
    - **Validates: Requirements 5.2, 6.2**

  - [x] 14.3 Write property test: 44px touch targets on all interactive elements
    - **Property 3: 44px touch targets on all interactive elements**
    - Write a test that scans all TSX files for `<Button`, `<a `, and nav item elements
    - Assert that each occurrence has either `min-h-\[44px\]` or `min-h-11` in its className
    - **Validates: Requirements 6.10**

  - [x] 14.4 Write property test: pill shape on all buttons and badges
    - **Property 4: Pill shape on all buttons and badges**
    - Write a test that scans all TSX files for `<Button` and `<Badge` elements
    - Assert that each occurrence has `rounded-full` in its className
    - **Validates: Requirements 6.3, 6.4**

- [x] 15. Create apps/web/.env.local and document the API URL variable
  - [x] 15.1 Create apps/web/.env.local with NEXT_PUBLIC_API_URL
    - Create `apps/web/.env.local` with the single line: `NEXT_PUBLIC_API_URL=http://localhost:3001`
    - Verify `.env.local` is listed in `apps/web/.gitignore` (Next.js adds it by default; add it explicitly if missing)
    - _Requirements: 7.1_

  - [x] 15.2 Create apps/web/.env.example documenting the variable
    - Create `apps/web/.env.example` with content:
      ```
      # API server base URL — set to http://localhost:3001 for local development
      # Set to your production API URL in the Vercel environment variables dashboard
      NEXT_PUBLIC_API_URL=
      ```
    - _Requirements: 7.2_

  - [x] 15.3 Add fallback and missing-variable warning to the apiFetch utility
    - Locate or create `apps/web/lib/api.ts` (the `apiFetch` utility)
    - Set `const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'`
    - Add a build-time/runtime warning: if `typeof window === 'undefined' && !process.env.NEXT_PUBLIC_API_URL` then `console.warn('[AmarSpace] NEXT_PUBLIC_API_URL is not set — falling back to http://localhost:3001')`
    - Ensure all existing API calls in `apps/web` use this utility rather than hardcoded URLs
    - _Requirements: 7.3, 7.4_

- [x] 16. Final checkpoint — full build and lint pass
  - Run `bun run build` from the monorepo root and confirm zero errors across all packages
  - Run `bun run check` (Biome lint + format) and fix any remaining issues
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Tasks 1–4 (monorepo cleanup + API fixes) are independent of the frontend tasks and can be done first
- Tasks 5–6 (Tailwind + token setup) must complete before any migration tasks (7–12)
- Tasks 7–12 (component migrations) can be parallelized once the shared UI primitives in task 7 are done
- Property tests in task 14 validate the migration is complete and can be run as a final check
- The `apps/docs` directory does not exist in the current repo (confirmed by directory listing) — task 1.1 should verify this and clean up any lingering references in config files
- shadcn `init` may prompt to overwrite existing files in `components/ui/` — review diffs carefully and preserve any custom logic (e.g., `StatusBadge` variant mapping, `FormField` error state)
- Tailwind v4 uses `@import "tailwindcss"` instead of `@tailwind base/components/utilities` directives — the globals.css rewrite in task 6.1 handles this transition

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1"] },
    { "id": 1, "tasks": ["3.2", "5.1"] },
    { "id": 2, "tasks": ["5.2", "5.3"] },
    { "id": 3, "tasks": ["5.4"] },
    { "id": 4, "tasks": ["6.1"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4", "9.1", "9.2", "10.1", "10.2", "10.3", "10.4"] },
    { "id": 7, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "11.7", "11.8", "11.9", "11.10", "12.1", "12.2", "12.3"] },
    { "id": 8, "tasks": ["14.1", "14.2", "14.3", "14.4", "15.1", "15.2", "15.3"] }
  ]
}
```
