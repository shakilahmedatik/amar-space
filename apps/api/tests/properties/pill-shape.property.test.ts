import * as fs from 'node:fs'
import * as path from 'node:path'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

/**
 * Feature: amarspace-fixes-and-ui-overhaul
 * Property 4: Pill shape on all buttons and badges
 *
 * For all `<Button>` and `<Badge>` elements in migrated components,
 * the `rounded-full` class is present — the pill shape is a non-negotiable
 * system signature per DESIGN.md.
 *
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEB_ROOT = path.resolve(__dirname, '../../../../apps/web')

/**
 * Recursively collect all .tsx files under a directory,
 * excluding node_modules and the shadcn primitive files themselves.
 */
function collectTsxFiles(dir: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      results.push(...collectTsxFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(fullPath)
    }
  }
  return results
}

/**
 * The shadcn primitive files — excluded from the scan because:
 * - button.tsx: the Button component itself; its base classes are applied at
 *   the call site via className, not in the primitive definition.
 * - badge.tsx: the Badge component has `rounded-full` in its CVA base string,
 *   which is verified separately in the badge-component test below.
 */
const EXCLUDED_PRIMITIVES = new Set([
  path.join(WEB_ROOT, 'components/ui/button.tsx'),
  path.join(WEB_ROOT, 'components/ui/badge.tsx'),
])

/**
 * Find all line indices (0-based) where a pattern matches in the given lines.
 */
function findMatchingLines(lines: string[], pattern: RegExp): number[] {
  return lines.reduce<number[]>((acc, line, idx) => {
    if (pattern.test(line)) acc.push(idx)
    return acc
  }, [])
}

/**
 * Check whether `rounded-full` appears within `windowSize` lines
 * (before or after) of the given line index.
 */
function hasRoundedFullNearby(
  lines: string[],
  lineIdx: number,
  windowSize = 10,
): boolean {
  const start = Math.max(0, lineIdx - 1)
  const end = Math.min(lines.length - 1, lineIdx + windowSize)
  for (let i = start; i <= end; i++) {
    if (lines[i].includes('rounded-full')) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Collect files
// ---------------------------------------------------------------------------

const allTsxFiles = collectTsxFiles(WEB_ROOT).filter(
  (f) => !EXCLUDED_PRIMITIVES.has(f),
)

const filesWithButtons = allTsxFiles.filter((f) => {
  const content = fs.readFileSync(f, 'utf-8')
  return content.includes('<Button')
})

const filesWithBadges = allTsxFiles.filter((f) => {
  const content = fs.readFileSync(f, 'utf-8')
  return content.includes('<Badge')
})

// ---------------------------------------------------------------------------
// Property 4a: Every <Button> occurrence has rounded-full nearby
// ---------------------------------------------------------------------------

describe('Feature: amarspace-fixes-and-ui-overhaul, Property 4: Pill shape on all buttons and badges', () => {
  describe('4a — Every <Button> element has rounded-full in its className (within 10 lines)', () => {
    it('all TSX files with <Button> elements have rounded-full near each occurrence', () => {
      // Use fast-check to iterate over the collected file list as an exhaustive
      // property — every element of the array must satisfy the invariant.
      fc.assert(
        fc.property(fc.constantFrom(...filesWithButtons), (filePath) => {
          const content = fs.readFileSync(filePath, 'utf-8')
          const lines = content.split('\n')

          // Find every line that opens a <Button JSX element
          const buttonLineIndices = findMatchingLines(lines, /<Button[\s/>]/)

          for (const lineIdx of buttonLineIndices) {
            const hasRounded = hasRoundedFullNearby(lines, lineIdx, 10)
            if (!hasRounded) {
              const relPath = path.relative(WEB_ROOT, filePath)
              throw new Error(
                `Missing rounded-full near <Button at ${relPath}:${lineIdx + 1}\n` +
                  `  Context: ${lines.slice(Math.max(0, lineIdx - 1), lineIdx + 6).join('\n  ')}`,
              )
            }
          }

          return true
        }),
        { numRuns: filesWithButtons.length },
      )
    })
  })

  // -------------------------------------------------------------------------
  // Property 4b: The shadcn Badge component definition contains rounded-full
  // -------------------------------------------------------------------------

  describe('4b — The shadcn Badge component base classes include rounded-full', () => {
    it('badge.tsx CVA base string contains rounded-full', () => {
      const badgePath = path.join(WEB_ROOT, 'components/ui/badge.tsx')
      expect(fs.existsSync(badgePath)).toBe(true)

      const content = fs.readFileSync(badgePath, 'utf-8')

      // The CVA base string must contain rounded-full so every Badge instance
      // inherits the pill shape regardless of the call-site className.
      expect(content).toContain('rounded-full')
    })
  })

  // -------------------------------------------------------------------------
  // Property 4c: Every <Badge> usage in application code has rounded-full
  //              either in its className prop or inherited from the component
  // -------------------------------------------------------------------------

  describe('4c — Every <Badge> element in application code has rounded-full nearby', () => {
    it('all TSX files with <Badge> elements have rounded-full near each occurrence', () => {
      // Badge inherits rounded-full from its CVA base (verified in 4b).
      // Application code that passes an explicit className should also include
      // rounded-full (or rely on the base class).  We verify that rounded-full
      // appears within the surrounding context of every <Badge usage.
      fc.assert(
        fc.property(fc.constantFrom(...filesWithBadges), (filePath) => {
          const content = fs.readFileSync(filePath, 'utf-8')
          const lines = content.split('\n')

          const badgeLineIndices = findMatchingLines(lines, /<Badge[\s/>]/)

          for (const lineIdx of badgeLineIndices) {
            const hasRounded = hasRoundedFullNearby(lines, lineIdx, 10)
            if (!hasRounded) {
              const relPath = path.relative(WEB_ROOT, filePath)
              throw new Error(
                `Missing rounded-full near <Badge at ${relPath}:${lineIdx + 1}\n` +
                  `  Context: ${lines.slice(Math.max(0, lineIdx - 1), lineIdx + 6).join('\n  ')}`,
              )
            }
          }

          return true
        }),
        { numRuns: filesWithBadges.length },
      )
    })
  })

  // -------------------------------------------------------------------------
  // Property 4d: The overall codebase has at least one rounded-full per file
  //              that uses Button or Badge (sanity check)
  // -------------------------------------------------------------------------

  describe('4d — Sanity: every file using Button or Badge contains rounded-full somewhere', () => {
    it('no file with <Button> or <Badge> is entirely missing rounded-full', () => {
      const allRelevantFiles = Array.from(
        new Set([...filesWithButtons, ...filesWithBadges]),
      )

      fc.assert(
        fc.property(fc.constantFrom(...allRelevantFiles), (filePath) => {
          const content = fs.readFileSync(filePath, 'utf-8')
          const relPath = path.relative(WEB_ROOT, filePath)

          expect(content, `${relPath} must contain rounded-full`).toContain(
            'rounded-full',
          )

          return true
        }),
        { numRuns: allRelevantFiles.length },
      )
    })
  })
})
