import * as fs from "node:fs";
import * as path from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

/**
 * Feature: amarspace-fixes-and-ui-overhaul
 * Property 1: No inline styles remain after migration
 *
 * For all TSX files in `apps/web/components/**\/*.tsx` and
 * `apps/web/app/**\/*.tsx`, no `style={{` prop exists after the migration
 * is complete.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively collect all .tsx files under a directory */
function collectTsxFiles(dir: string): string[] {
	const results: string[] = [];
	if (!fs.existsSync(dir)) return results;

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...collectTsxFiles(fullPath));
		} else if (entry.isFile() && entry.name.endsWith(".tsx")) {
			results.push(fullPath);
		}
	}
	return results;
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

const webRoot = path.resolve(__dirname, "../..");
const componentFiles = collectTsxFiles(path.join(webRoot, "components"));
const appFiles = collectTsxFiles(path.join(webRoot, "app"));
const allTsxFiles = [...componentFiles, ...appFiles];

// ---------------------------------------------------------------------------
// Property 1: No inline styles remain after migration
// ---------------------------------------------------------------------------

describe("Feature: amarspace-fixes-and-ui-overhaul, Property 1: No inline styles remain after migration", () => {
	it("should discover at least one TSX file to test", () => {
		expect(allTsxFiles.length).toBeGreaterThan(0);
	});

	it("for every TSX file in components/ and app/, the source contains zero occurrences of style={{", () => {
		// Use fast-check to generate arbitrary file paths from the discovered list
		// and assert the property holds for each sampled file.
		fc.assert(
			fc.property(fc.constantFrom(...allTsxFiles), (filePath) => {
				const source = fs.readFileSync(filePath, "utf-8");
				const occurrences = (source.match(/style=\{\{/g) ?? []).length;

				expect(
					occurrences,
					`Found ${occurrences} inline style(s) in ${path.relative(webRoot, filePath)}`,
				).toBe(0);
			}),
			{ numRuns: allTsxFiles.length },
		);
	});

	it("exhaustively checks every discovered TSX file for the style={{ pattern", () => {
		const violations: string[] = [];

		for (const filePath of allTsxFiles) {
			const source = fs.readFileSync(filePath, "utf-8");
			const matches = source.match(/style=\{\{/g);
			if (matches && matches.length > 0) {
				violations.push(
					`${path.relative(webRoot, filePath)}: ${matches.length} occurrence(s)`,
				);
			}
		}

		expect(
			violations,
			`Files with remaining inline styles:\n${violations.join("\n")}`,
		).toHaveLength(0);
	});
});
