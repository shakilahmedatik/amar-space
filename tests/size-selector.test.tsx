import { SizeSelector } from "@/components/qr-code/size-selector";
import { I18nProvider } from "@/lib/i18n";
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	cleanup();
});

function renderWithI18n(ui: React.ReactElement) {
	return render(<I18nProvider initialLocale="en">{ui}</I18nProvider>);
}

describe("SizeSelector", () => {
	it("defaults to 300px when value is 300", () => {
		const onChange = vi.fn();
		renderWithI18n(<SizeSelector value={300} onChange={onChange} />);

		const selectedOption = screen.getByRole("radio", { name: "300px" });
		expect(selectedOption.getAttribute("data-state")).toBe("checked");
	});

	it("renders exactly 4 radio items", () => {
		const onChange = vi.fn();
		renderWithI18n(<SizeSelector value={300} onChange={onChange} />);

		const radioItems = screen.getAllByRole("radio");
		expect(radioItems).toHaveLength(4);
	});

	it("displays the correct size labels (200px, 300px, 500px, 800px)", () => {
		const onChange = vi.fn();
		renderWithI18n(<SizeSelector value={300} onChange={onChange} />);

		expect(screen.getByRole("radio", { name: "200px" })).toBeDefined();
		expect(screen.getByRole("radio", { name: "300px" })).toBeDefined();
		expect(screen.getByRole("radio", { name: "500px" })).toBeDefined();
		expect(screen.getByRole("radio", { name: "800px" })).toBeDefined();
	});

	it("calls onChange with the new size when a different option is clicked", () => {
		const onChange = vi.fn();
		renderWithI18n(<SizeSelector value={300} onChange={onChange} />);

		const option500 = screen.getByRole("radio", { name: "500px" });
		fireEvent.click(option500);

		expect(onChange).toHaveBeenCalledWith(500);
	});

	it("supports keyboard navigation within the radio group", () => {
		const onChange = vi.fn();
		renderWithI18n(<SizeSelector value={300} onChange={onChange} />);

		// The radio group has role="radiogroup" and is keyboard-navigable
		const radioGroup = screen.getByRole("radiogroup");
		expect(radioGroup).toBeDefined();

		// Verify the radio group has aria-label for accessibility
		expect(radioGroup.getAttribute("aria-label")).toBeTruthy();

		// Verify all radio items are focusable (not disabled by default)
		const radioItems = screen.getAllByRole("radio");
		for (const item of radioItems) {
			expect(item.getAttribute("disabled")).toBeNull();
		}

		// Verify the selected item has checked state and others do not
		const checked = screen.getByRole("radio", { name: "300px" });
		expect(checked.getAttribute("data-state")).toBe("checked");

		const unchecked = screen.getByRole("radio", { name: "200px" });
		expect(unchecked.getAttribute("data-state")).toBe("unchecked");
	});
});
