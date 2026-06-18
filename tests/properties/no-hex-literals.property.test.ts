import * as fs from "node:fs";
import * as path from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

/**
 * Feature: amarspace-fixes-and-ui-overhaul
 * Property 2: No raw hex literals outside globals.css
 *
 * For all color values in migrated component files, no raw hex literals
 * matching `#[0-9a-fA-F]{3,6}` appear — all colors are expressed through
 * Tailwind token classes derived from the `@theme` block in `globals.css`.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEB_ROOT = path.resolve(__dirname, "../..");

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

/** Raw hex literal pattern: # followed by 3–6 hex digits */
// const HEX_LITERAL_RE = /#[0-9a-fA-F]{3,6}\b/

/**
 * Returns all hex literal matches found in the given source text,
 * along with the line number for each match (1-indexed).
 */
function findHexLiterals(
	source: string,
): Array<{ match: string; line: number }> {
	const hits: Array<{ match: string; line: number }> = [];
	const lines = source.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const globalRe = /#[0-9a-fA-F]{3,6}\b/g;
		let m: RegExpExecArray | null;
		// biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop
		while ((m = globalRe.exec(line)) !== null) {
			hits.push({ match: m[0]!, line: i + 1 });
		}
	}
	return hits;
}

// ---------------------------------------------------------------------------
// Collect file paths once at module load time
// ---------------------------------------------------------------------------

const componentFiles = collectTsxFiles(path.join(WEB_ROOT, "components"));
const appFiles = collectTsxFiles(path.join(WEB_ROOT, "app"));
const allTsxFiles = [...componentFiles, ...appFiles];

// ---------------------------------------------------------------------------
// Property 2: No raw hex literals in any TSX file
// ---------------------------------------------------------------------------

describe("Feature: amarspace-fixes-and-ui-overhaul, Property 2: No raw hex literals outside globals.css", () => {
	describe("2a — No TSX file in components/**/*.tsx contains a raw hex literal", () => {
		it("every component TSX file is free of raw hex literals", () => {
			const violations: string[] = [];

			for (const filePath of componentFiles) {
				const source = fs.readFileSync(filePath, "utf-8");
				const hits = findHexLiterals(source);
				if (hits.length > 0) {
					const relPath = path.relative(WEB_ROOT, filePath);
					for (const { match, line } of hits) {
						violations.push(`${relPath}:${line} — found "${match}"`);
					}
				}
			}

			expect(
				violations,
				`Raw hex literals found:\n${violations.join("\n")}`,
			).toHaveLength(0);
		});
	});

	describe("2b — No TSX file in app/**/*.tsx contains a raw hex literal", () => {
		it("every app TSX file is free of raw hex literals", () => {
			const violations: string[] = [];

			for (const filePath of appFiles) {
				const source = fs.readFileSync(filePath, "utf-8");
				const hits = findHexLiterals(source);
				if (hits.length > 0) {
					const relPath = path.relative(WEB_ROOT, filePath);
					for (const { match, line } of hits) {
						violations.push(`${relPath}:${line} — found "${match}"`);
					}
				}
			}

			expect(
				violations,
				`Raw hex literals found:\n${violations.join("\n")}`,
			).toHaveLength(0);
		});
	});

	describe("2c — Property: for any sampled TSX file path, the file contains no hex literals", () => {
		it("fast-check: sampled TSX files contain no raw hex literals", () => {
			// Guard: if there are no files to test, skip the property check
			if (allTsxFiles.length === 0) {
				return;
			}

			fc.assert(
				fc.property(fc.constantFrom(...allTsxFiles), (filePath) => {
					const source = fs.readFileSync(filePath, "utf-8");
					const hits = findHexLiterals(source);
					const relPath = path.relative(WEB_ROOT, filePath);

					expect(
						hits,
						`File ${relPath} contains raw hex literals: ${hits.map((h) => `"${h.match}" at line ${h.line}`).join(", ")}`,
					).toHaveLength(0);
				}),
				{ numRuns: Math.min(allTsxFiles.length, 200) },
			);
		});
	});

	describe("2d — globals.css is excluded from the scan", () => {
		it("globals.css is not in the scanned file list", () => {
			const globalsPath = path.join(WEB_ROOT, "app", "globals.css");
			const isIncluded = allTsxFiles.some((f) => f === globalsPath);
			// globals.css is a .css file, not .tsx — it is naturally excluded
			expect(isIncluded).toBe(false);
		});
	});

	describe("2e — The file scanner finds the expected TSX files", () => {
		it("at least one TSX file is found in components/ and app/", () => {
			expect(componentFiles.length).toBeGreaterThan(0);
			expect(appFiles.length).toBeGreaterThan(0);
		});

		it("all scanned files have a .tsx extension", () => {
			fc.assert(
				fc.property(fc.constantFrom(...allTsxFiles), (filePath) => {
					expect(filePath).toMatch(/\.tsx$/);
				}),
				{ numRuns: Math.min(allTsxFiles.length, 200) },
			);
		});
	});
});
