/**
 * BDT Currency Formatter
 *
 * Formats numbers using the Bangladeshi Taka symbol (৳) with the
 * Bangladeshi numbering system (Indian grouping: last 3 digits, then groups of 2).
 * Example: 123456.78 → ৳1,23,456.78
 */
export function formatBDT(amount: number): string {
	if (!Number.isFinite(amount)) {
		return "৳0.00";
	}

	const isNegative = amount < 0;
	const absoluteAmount = Math.abs(amount);

	// Split into integer and decimal parts
	const [integerPart, decimalPart] = absoluteAmount.toFixed(2).split(".");

	// Apply Bangladeshi numbering system grouping
	const formattedInteger = applyBangladeshiGrouping(integerPart ?? "0");

	const sign = isNegative ? "-" : "";
	return `${sign}৳${formattedInteger}.${decimalPart}`;
}

/**
 * Applies Bangladeshi/Indian numbering system grouping:
 * - Last 3 digits form the first group
 * - Remaining digits are grouped in pairs from right to left
 * Example: "12345678" → "1,23,45,678"
 */
function applyBangladeshiGrouping(integerStr: string): string {
	if (integerStr.length <= 3) {
		return integerStr;
	}

	// Last 3 digits
	const lastThree = integerStr.slice(-3);
	const remaining = integerStr.slice(0, -3);

	// Group remaining digits in pairs from right to left
	const pairs: string[] = [];
	let i = remaining.length;
	while (i > 0) {
		const start = Math.max(0, i - 2);
		pairs.unshift(remaining.slice(start, i));
		i = start;
	}

	return `${pairs.join(",")},${lastThree}`;
}

/**
 * Date Formatter
 *
 * Formats a Date object to DD/MM/YYYY format using Western Arabic numerals (0-9).
 * This follows the Bangla locale date format convention.
 */
export function formatDate(date: Date): string {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
		return "";
	}

	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = String(date.getFullYear());

	return `${day}/${month}/${year}`;
}

/**
 * Parses a DD/MM/YYYY formatted date string into a Date object.
 * Returns null if the string is not a valid date.
 */
export function parseDate(dateStr: string): Date | null {
	const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (!match) return null;

	const [, day, month, year] = match;
	const date = new Date(Number(year), Number(month) - 1, Number(day));

	// Validate the date is real (e.g., not 31/02/2024)
	if (
		date.getDate() !== Number(day) ||
		date.getMonth() !== Number(month) - 1 ||
		date.getFullYear() !== Number(year)
	) {
		return null;
	}

	return date;
}
