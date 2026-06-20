import { describe, expect, it } from "vitest";
import { FLAT_SLUG_PATTERN, isValidFlatSlug } from "./slug-validation";

describe("isValidFlatSlug", () => {
	it("accepts lowercase alphanumeric slugs", () => {
		expect(isValidFlatSlug("building-a-flat-4a")).toBe(true);
		expect(isValidFlatSlug("b1-4a")).toBe(true);
		expect(isValidFlatSlug("abc123")).toBe(true);
	});

	it("accepts single character slugs", () => {
		expect(isValidFlatSlug("a")).toBe(true);
		expect(isValidFlatSlug("0")).toBe(true);
		expect(isValidFlatSlug("-")).toBe(true);
	});

	it("accepts slugs at the 100 character boundary", () => {
		const slug100 = "a".repeat(100);
		expect(isValidFlatSlug(slug100)).toBe(true);
	});

	it("rejects empty strings", () => {
		expect(isValidFlatSlug("")).toBe(false);
	});

	it("rejects slugs exceeding 100 characters", () => {
		const slug101 = "a".repeat(101);
		expect(isValidFlatSlug(slug101)).toBe(false);
	});

	it("rejects uppercase characters", () => {
		expect(isValidFlatSlug("Building-A")).toBe(false);
		expect(isValidFlatSlug("FLAT")).toBe(false);
	});

	it("rejects special characters", () => {
		expect(isValidFlatSlug("flat_4a")).toBe(false);
		expect(isValidFlatSlug("flat.4a")).toBe(false);
		expect(isValidFlatSlug("flat/4a")).toBe(false);
		expect(isValidFlatSlug("flat 4a")).toBe(false);
		expect(isValidFlatSlug("flat@4a")).toBe(false);
	});

	it("rejects strings with unicode characters", () => {
		expect(isValidFlatSlug("ফ্ল্যাট")).toBe(false);
		expect(isValidFlatSlug("flat-é")).toBe(false);
	});
});

describe("FLAT_SLUG_PATTERN", () => {
	it("is exported as a RegExp", () => {
		expect(FLAT_SLUG_PATTERN).toBeInstanceOf(RegExp);
	});

	it("matches valid slugs", () => {
		expect(FLAT_SLUG_PATTERN.test("building-a-flat-4a")).toBe(true);
	});

	it("does not match invalid slugs", () => {
		expect(FLAT_SLUG_PATTERN.test("")).toBe(false);
		expect(FLAT_SLUG_PATTERN.test("INVALID")).toBe(false);
	});
});
