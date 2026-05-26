import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT_DIR = resolve(__dirname, '../../../..')

describe('Monorepo Wiring Integration', () => {
  describe('apps/api imports from @repo/db resolve types correctly', () => {
    it('should import createDbClient from @repo/db root entry point', async () => {
      const { createDbClient } = await import('@repo/db')
      expect(createDbClient).toBeDefined()
      expect(typeof createDbClient).toBe('function')
    })

    it('should import schema types from @repo/db/schema', async () => {
      const schema = await import('@repo/db/schema')
      expect(schema.users).toBeDefined()
      expect(schema.sessions).toBeDefined()
      expect(schema.auditLogs).toBeDefined()
      expect(schema.loginAttempts).toBeDefined()
    })

    it('should import client utilities from @repo/db/client', async () => {
      const { createDbClient, validateConnection } = await import(
        '@repo/db/client'
      )
      expect(createDbClient).toBeDefined()
      expect(validateConnection).toBeDefined()
      expect(typeof createDbClient).toBe('function')
      expect(typeof validateConnection).toBe('function')
    })

    it('should import migrate utilities from @repo/db/migrate', async () => {
      const migrate = await import('@repo/db/migrate')
      expect(migrate.runMigrations).toBeDefined()
      expect(typeof migrate.runMigrations).toBe('function')
    })

    it('should resolve Database type from @repo/db correctly', async () => {
      const { createDbClient } = await import('@repo/db/client')
      // Verify the function signature works - calling without URL should throw
      expect(() => createDbClient()).toThrow()
    })
  })

  describe('turbo run build completes with correct dependency order', () => {
    it('should complete turbo run build successfully', () => {
      // Run turbo build with --dry=json to verify dependency order without full build
      const result = execSync('npx turbo run build --dry=json', {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        timeout: 60_000,
      })

      const dryRun = JSON.parse(result)

      // Verify the task graph includes packages/db and apps/api
      const taskIds = dryRun.tasks.map((t: { taskId: string }) => t.taskId)

      // @repo/db should be in the task graph
      expect(taskIds).toContain('@repo/db#build')
      // apps/api should be in the task graph
      expect(taskIds).toContain('api#build')
    })

    it('should build @repo/db before apps/api (dependency order)', () => {
      const result = execSync('npx turbo run build --dry=json', {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        timeout: 60_000,
      })

      const dryRun = JSON.parse(result)
      const tasks = dryRun.tasks as Array<{
        taskId: string
        dependencies: string[]
      }>

      // Find the api#build task
      const apiBuildTask = tasks.find((t) => t.taskId === 'api#build')

      expect(apiBuildTask).toBeDefined()
      // api#build should depend on @repo/db#build
      expect(apiBuildTask!.dependencies).toContain('@repo/db#build')
    })
  })

  describe('turbo run check-types catches type errors across workspace boundaries', () => {
    it('should confirm exports map enforcement via @ts-expect-error validation', () => {
      // The tsconfig.type-check.json includes tests/type-checks/unexported-import.ts
      // which uses @ts-expect-error on an import from "@repo/db/seed" (not in exports map).
      //
      // If tsc passes with @ts-expect-error, it confirms the import IS invalid
      // (the directive suppresses the expected error). If the import were valid,
      // @ts-expect-error would itself cause an "Unused directive" error and tsc would fail.
      const result = execSync(
        'npx tsc --noEmit --project tsconfig.type-check.json',
        {
          cwd: resolve(ROOT_DIR, 'apps/api'),
          encoding: 'utf-8',
          timeout: 30_000,
        },
      )

      // tsc exits 0 = @ts-expect-error correctly suppressed a real type error
      // This proves "@repo/db/seed" is NOT a valid import path (exports map works)
      expect(result.trim()).toBe('')
    })

    it('should pass check-types for valid imports in apps/api', () => {
      // Running check-types on the main tsconfig (which excludes the intentionally-broken file)
      // should succeed, confirming valid @repo/db imports resolve correctly
      const result = execSync('npx tsc --noEmit', {
        cwd: resolve(ROOT_DIR, 'apps/api'),
        encoding: 'utf-8',
        timeout: 30_000,
      })

      // If tsc succeeds, it returns empty string (no errors)
      expect(result.trim()).toBe('')
    })
  })
})
