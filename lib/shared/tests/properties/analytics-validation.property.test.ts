// Feature: renter-qr-portal, Property 9: Analytics event structure
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { analyticsEventSchema } from "../../src/portal/analytics-validation";

/**
 * Property 9: Analytics event structure
 *
 * *For any* analytics event tracked by the portal, the event payload SHALL
 * always contain a non-empty `flat_slug` string and a valid ISO 8601
 * `timestamp` field.
 *
 */
describe("Property 9: Analytics event structure", () => {
	// Generator for valid ISO 8601 timestamps with offset
	const isoTimestampArb = fc
		.integer({
			min: new Date("2020-01-01T00:00:00Z").getTime(),
			max: new Date("2030-12-31T23:59:59Z").getTime(),
		})
		.map((ms) => new Date(ms).toISOString());

	// Generator for valid flat slugs (non-empty, lowercase alphanumeric + hyphens)
	const validFlatSlugArb = fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,99}$/);

	// Generator for valid event names
	const validEventNameArb = fc.constantFrom(
		"QR Scanned",
		"Registration Started",
		"Registration Submitted",
		"Access Code Attempted",
		"Access Granted",
		"WhatsApp Clicked",
		"Emergency Contact Clicked",
		"Notice Viewed",
	);

	// Generator for valid analytics event payloads
	const validAnalyticsEventArb = fc.record({
		event: validEventNameArb,
		flatSlug: validFlatSlugArb,
		timestamp: isoTimestampArb,
		userAgent: fc.string({ minLength: 1 }),
		metadata: fc.option(
			fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
			{ nil: undefined },
		),
	});

	it("valid events always pass schema validation with non-empty flatSlug and valid ISO timestamp", () => {
		fc.assert(
			fc.property(validAnalyticsEventArb, (event) => {
				const result = analyticsEventSchema.safeParse(event);
				expect(result.success).toBe(true);

				if (result.success) {
					// flatSlug must be non-empty
					expect(result.data.flatSlug.length).toBeGreaterThan(0);
					// timestamp must be a valid ISO 8601 string
					expect(Number.isNaN(Date.parse(result.data.timestamp))).toBe(false);
				}
			}),
			{ numRuns: 100 },
		);
	});

	it("events with empty flatSlug are always rejected", () => {
		fc.assert(
			fc.property(
				isoTimestampArb,
				validEventNameArb,
				fc.string(),
				(timestamp, event, userAgent) => {
					const payload = {
						event,
						flatSlug: "",
						timestamp,
						userAgent,
					};
					const result = analyticsEventSchema.safeParse(payload);
					expect(result.success).toBe(false);
				},
			),
			{ numRuns: 100 },
		);
	});

	it("events with invalid ISO 8601 timestamp are always rejected", () => {
		// Generate strings that are NOT valid ISO 8601 timestamps
		const invalidTimestampArb = fc.oneof(
			fc.constant("not-a-date"),
			fc.constant("2024-13-01T00:00:00Z"),
			fc.constant("yesterday"),
			fc.constant("12/31/2024"),
			fc.constant(""),
			fc.stringMatching(/^[a-z]{1,20}$/),
		);

		fc.assert(
			fc.property(
				invalidTimestampArb,
				validFlatSlugArb,
				validEventNameArb,
				fc.string(),
				(timestamp, flatSlug, event, userAgent) => {
					const payload = {
						event,
						flatSlug,
						timestamp,
						userAgent,
					};
					const result = analyticsEventSchema.safeParse(payload);
					expect(result.success).toBe(false);
				},
			),
			{ numRuns: 100 },
		);
	});

	it("parsed events always preserve the original flatSlug and timestamp values", () => {
		fc.assert(
			fc.property(validAnalyticsEventArb, (event) => {
				const result = analyticsEventSchema.safeParse(event);
				if (result.success) {
					expect(result.data.flatSlug).toBe(event.flatSlug);
					expect(result.data.timestamp).toBe(event.timestamp);
				}
			}),
			{ numRuns: 100 },
		);
	});
});
