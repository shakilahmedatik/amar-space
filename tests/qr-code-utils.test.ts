import { describe, expect, it } from "vitest";
import {
	getBulkQrFilename,
	getQrFilename,
	sanitizeFilename,
} from "../lib/qr-code-utils";

describe("sanitizeFilename", () => {
	it("replaces special characters with underscores", () => {
		expect(sanitizeFilename("A/B#C")).toBe("A_B_C");
	});

	it("preserves Bengali text", () => {
		expect(sanitizeFilename("বিল্ডিং")).toBe("বিল্ডিং");
	});

	it("returns empty string for empty input", () => {
		expect(sanitizeFilename("")).toBe("");
	});

	it("preserves hyphens", () => {
		expect(sanitizeFilename("flat-101")).toBe("flat-101");
	});

	it("preserves alphanumeric characters", () => {
		expect(sanitizeFilename("abc123")).toBe("abc123");
	});

	it("replaces spaces with underscores", () => {
		expect(sanitizeFilename("My Building")).toBe("My_Building");
	});
});

describe("getQrFilename", () => {
	it("produces correct filename for simple flat number", () => {
		expect(getQrFilename("101")).toBe("101_qr.png");
	});

	it("sanitizes special characters in flat number", () => {
		expect(getQrFilename("A/B")).toBe("A_B_qr.png");
	});
});

describe("getBulkQrFilename", () => {
	it("produces correct filename for English building name", () => {
		expect(getBulkQrFilename("My Building")).toBe("My_Building_qr_codes.zip");
	});

	it("preserves Bengali characters in building name", () => {
		expect(getBulkQrFilename("বিল্ডিং")).toBe("বিল্ডিং_qr_codes.zip");
	});
});
