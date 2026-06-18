import { StatusBadge } from "@/components/ui/status-badge";
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/i18n", () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const translations: Record<string, string> = {
				"flats.vacant": "খালি",
				"flats.occupied": "ভাড়া হয়েছে",
				"flats.underMaintenance": "রক্ষণাবেক্ষণ",
			};
			return translations[key] || key;
		},
		locale: "bn",
	}),
}));

afterEach(() => {
	cleanup();
});

describe("PortalStatusBadge", () => {
	it('renders green badge with "খালি" for AVAILABLE status', () => {
		render(<StatusBadge status="AVAILABLE" />);

		const badge = screen.getByRole("status");
		expect(badge).toBeDefined();
		expect(badge.textContent).toContain("খালি");
		expect(badge.className).toContain("bg-success-bg");
		expect(badge.className).toContain("text-success-text");
	});

	it('renders blue badge with "ভাড়া হয়েছে" for OCCUPIED status', () => {
		render(<StatusBadge status="OCCUPIED" />);

		const badge = screen.getByRole("status");
		expect(badge).toBeDefined();
		expect(badge.textContent).toContain("ভাড়া হয়েছে");
		expect(badge.className).toContain("bg-brand-blue-200");
		expect(badge.className).toContain("text-brand-blue-deep");
	});

	it('renders orange badge with "রক্ষণাবেক্ষণ" for MAINTENANCE status', () => {
		render(<StatusBadge status="MAINTENANCE" />);

		const badge = screen.getByRole("status");
		expect(badge).toBeDefined();
		expect(badge.textContent).toContain("রক্ষণাবেক্ষণ");
		expect(badge.className).toContain("bg-warning-bg");
		expect(badge.className).toContain("text-warning-text");
	});

	it('renders grey badge with "অজানা" for unknown status', () => {
		render(<StatusBadge status="SOMETHING_ELSE" />);

		const badge = screen.getByRole("status");
		expect(badge).toBeDefined();
		expect(badge.textContent).toContain("SOMETHING_ELSE");
	});
});
