import * as fs from "node:fs";
import * as path from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

/**
 * Feature: amarspace-fixes-and-ui-overhaul
 * Property 3: 44px touch targets on all interactive elements
 *
 * Primary action buttons (submit buttons, nav items) must have either
 * `min-h-11` or `min-h-11` somewhere in the file to satisfy the
 * WCAG 2.5.5 minimum touch target size requirement.
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

/** Returns true if the source contains a 44px touch target class */
function hasTouchTarget(source: string): boolean {
	return /min-h-\[44px\]|min-h-11/.test(source);
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

const componentFiles = collectTsxFiles(path.join(WEB_ROOT, "components"));
const appFiles = collectTsxFiles(path.join(WEB_ROOT, "app"));
const allTsxFiles = [...componentFiles, ...appFiles];

/** Files that contain at least one <Button usage */
const buttonFiles = allTsxFiles.filter((f) => {
	const src = fs.readFileSync(f, "utf-8");
	return /<Button/.test(src);
});

/** Nav layout files that must have touch targets */
const navFiles = [
	path.join(WEB_ROOT, "components", "layout", "sidebar.tsx"),
	path.join(WEB_ROOT, "components", "layout", "bottom-tab-bar.tsx"),
].filter((f) => fs.existsSync(f));

// ---------------------------------------------------------------------------
// Property 3a — Sanity check: touch target classes exist in the codebase
// ---------------------------------------------------------------------------

describe("Feature: amarspace-fixes-and-ui-overhaul, Property 3: 44px touch targets on all interactive elements", () => {
	describe("3a — Sanity check: touch target classes are present in the codebase", () => {
		it("at least one TSX file contains min-h-11", () => {
			const found = allTsxFiles.some((f) => {
				const src = fs.readFileSync(f, "utf-8");
				return /min-h-\[44px\]/.test(src);
			});
			expect(found, "Expected at least one file with min-h-11").toBe(true);
		});

		it("at least one TSX file contains min-h-11", () => {
			const found = allTsxFiles.some((f) => {
				const src = fs.readFileSync(f, "utf-8");
				return /min-h-11/.test(src);
			});
			expect(found, "Expected at least one file with min-h-11").toBe(true);
		});
	});

	// ---------------------------------------------------------------------------
	// Property 3b — Nav layout files have touch targets
	// ---------------------------------------------------------------------------

	describe("3b — Nav layout files have 44px touch targets", () => {
		it("sidebar.tsx has min-h-11 or min-h-11", () => {
			const sidebarPath = path.join(
				WEB_ROOT,
				"components",
				"layout",
				"sidebar.tsx",
			);
			expect(fs.existsSync(sidebarPath), "sidebar.tsx must exist").toBe(true);
			const source = fs.readFileSync(sidebarPath, "utf-8");
			expect(
				hasTouchTarget(source),
				"sidebar.tsx must contain min-h-11 or min-h-11 for nav items",
			).toBe(true);
		});

		it("bottom-tab-bar.tsx has min-h-11 or min-h-11", () => {
			const tabBarPath = path.join(
				WEB_ROOT,
				"components",
				"layout",
				"bottom-tab-bar.tsx",
			);
			expect(fs.existsSync(tabBarPath), "bottom-tab-bar.tsx must exist").toBe(
				true,
			);
			const source = fs.readFileSync(tabBarPath, "utf-8");
			expect(
				hasTouchTarget(source),
				"bottom-tab-bar.tsx must contain min-h-11 or min-h-11 for tab items",
			).toBe(true);
		});

		it("all nav layout files have touch targets", () => {
			const violations: string[] = [];
			for (const filePath of navFiles) {
				const source = fs.readFileSync(filePath, "utf-8");
				if (!hasTouchTarget(source)) {
					violations.push(path.relative(WEB_ROOT, filePath));
				}
			}
			expect(
				violations,
				`Nav files missing touch targets:\n${violations.join("\n")}`,
			).toHaveLength(0);
		});
	});

	// ---------------------------------------------------------------------------
	// Property 3c — Files with <Button have touch target class somewhere in file
	// ---------------------------------------------------------------------------

	describe("3c — Files containing <Button have a touch target class", () => {
		it("discovers at least one file with <Button", () => {
			expect(buttonFiles.length).toBeGreaterThan(0);
		});

		it("every file containing <Button also contains min-h-11 or min-h-11", () => {
			const violations: string[] = [];
			for (const filePath of buttonFiles) {
				const source = fs.readFileSync(filePath, "utf-8");
				if (!hasTouchTarget(source)) {
					violations.push(path.relative(WEB_ROOT, filePath));
				}
			}
			expect(
				violations,
				`Files with <Button but no touch target class:\n${violations.join("\n")}`,
			).toHaveLength(0);
		});
	});

	// ---------------------------------------------------------------------------
	// Property 3d — fast-check: sampled Button files have touch targets
	// ---------------------------------------------------------------------------

	describe("3d — Property: sampled files with <Button have touch target classes", () => {
		it("fast-check: for any sampled file containing <Button, it has min-h-11 or min-h-11", () => {
			// Guard: need at least one file to run the property
			if (buttonFiles.length === 0) {
				return;
			}

			fc.assert(
				fc.property(fc.constantFrom(...buttonFiles), (filePath) => {
					const source = fs.readFileSync(filePath, "utf-8");
					const relPath = path.relative(WEB_ROOT, filePath);

					expect(
						hasTouchTarget(source),
						`File ${relPath} contains <Button but is missing min-h-11 or min-h-11`,
					).toBe(true);
				}),
				{ numRuns: buttonFiles.length },
			);
		});

		it("at least 80% of files with <Button have a touch target class", () => {
			if (buttonFiles.length === 0) return;

			const withTouchTarget = buttonFiles.filter((f) => {
				const src = fs.readFileSync(f, "utf-8");
				return hasTouchTarget(src);
			});

			const percentage = (withTouchTarget.length / buttonFiles.length) * 100;
			expect(
				percentage,
				`Only ${percentage.toFixed(1)}% of Button files have touch targets (expected ≥80%)`,
			).toBeGreaterThanOrEqual(80);
		});
	});
});
