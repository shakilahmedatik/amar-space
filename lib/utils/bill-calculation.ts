/**
 * Bill calculation utilities for proration and due dates.
 *
 * Proration rules:
 * - Rent is prorated by day-percentage for mid-month starts
 * - Service charges (gas, water, service, other) are always full monthly amount
 * - Payment due by 10th of the month following the billing month
 */

/**
 * Calculates the prorated rent for a given billing month based on the contract start date.
 *
 * @param monthlyRent - The full monthly rent amount as a string
 * @param contractStartDate - The contract start date (YYYY-MM-DD)
 * @param billingMonth - The billing month (YYYY-MM)
 * @returns Object with baseRent, rentDays, totalDaysInMonth, and monthlyRent
 */
export function calculateRentForMonth(
	monthlyRent: string,
	contractStartDate: string,
	billingMonth: string,
): {
	baseRent: string;
	rentDays: number | null;
	totalDaysInMonth: number;
	monthlyRent: string;
} {
	const rent = Number.parseFloat(monthlyRent);
	const parts = billingMonth.split("-");
	const year = Number(parts[0]);
	const month = Number(parts[1]);
	const totalDaysInMonth = new Date(year, month, 0).getDate();
	const firstOfMonth = new Date(year, month - 1, 1);
	const startDate = new Date(contractStartDate);

	// If contract started on or before the 1st of the billing month, full rent
	if (startDate <= firstOfMonth) {
		return {
			baseRent: monthlyRent,
			rentDays: null,
			totalDaysInMonth,
			monthlyRent,
		};
	}

	// If contract started mid-month, prorate
	// Contract starts on day N, they pay for days N through end of month
	const startDay = startDate.getDate();
	const rentDays = totalDaysInMonth - startDay + 1;
	const proratedRent =
		Math.round((rentDays / totalDaysInMonth) * rent * 100) / 100;

	return {
		baseRent: proratedRent.toFixed(2),
		rentDays,
		totalDaysInMonth,
		monthlyRent,
	};
}

/**
 * Calculates the due date for a bill based on the billing month.
 * Due date is the 10th of the month following the billing month.
 *
 * @param billingMonth - The billing month (YYYY-MM)
 * @returns The due date as a string (YYYY-MM-DD)
 */
export function calculateDueDate(billingMonth: string): string {
	const parts = billingMonth.split("-");
	const year = Number(parts[0]);
	const month = Number(parts[1]);
	const dueMonth = month === 12 ? 1 : month + 1;
	const dueYear = month === 12 ? year + 1 : year;
	const dueDate = new Date(dueYear, dueMonth - 1, 10);
	return dueDate.toISOString().split("T")[0] as string;
}

/**
 * Gets the last day of a given month (used for termination effective dates).
 *
 * @param month - The month in YYYY-MM format
 * @returns The last day as YYYY-MM-DD
 */
export function getLastDayOfMonth(month: string): string {
	const parts = month.split("-");
	const year = Number(parts[0]);
	const mo = Number(parts[1]);
	const lastDay = new Date(year, mo, 0).getDate();
	return `${month}-${String(lastDay).padStart(2, "0")}`;
}

/**
 * Contract default line items from a rental contract.
 * These are the service charges that are always full-month amounts.
 */
export interface ContractLineItem {
	description: string;
	amount: string;
}

/**
 * Extracts the default line items from a contract.
 * Service charges are always full amounts regardless of proration.
 */
export function getDefaultLineItems(contract: {
	gasBill: string | null;
	waterBill: string | null;
	serviceCharge: string | null;
	otherCharges: string | null;
}): ContractLineItem[] {
	const items: ContractLineItem[] = [];

	const utilities: Array<{ name: string; amount: string | null }> = [
		{
			name: "\u0997\u09CD\u09AF\u09BE\u09B8 \u09AC\u09BF\u09B2 (Gas Bill)",
			amount: contract.gasBill,
		},
		{
			name: "\u09AA\u09BE\u09A8\u09BF \u09AC\u09BF\u09B2 (Water Bill)",
			amount: contract.waterBill,
		},
		{
			name: "\u09B8\u09BE\u09B0\u09CD\u09AD\u09BF\u09B8 \u099A\u09BE\u09B0\u09CD\u099C (Service Charge)",
			amount: contract.serviceCharge,
		},
		{
			name: "\u0985\u09A8\u09CD\u09AF\u09BE\u09A8\u09CD\u09AF \u09AC\u09BF\u09B2 (Other Charges)",
			amount: contract.otherCharges,
		},
	];

	for (const util of utilities) {
		if (util.amount && Number.parseFloat(util.amount) > 0) {
			items.push({
				description: util.name,
				amount: Number.parseFloat(util.amount).toFixed(2),
			});
		}
	}

	return items;
}

/**
 * Calculates whether a contract started mid-month for a given billing period.
 */
export function isMidMonthStart(
	contractStartDate: string,
	billingMonth: string,
): boolean {
	const parts = billingMonth.split("-");
	const year = Number(parts[0]);
	const month = Number(parts[1]);
	const firstOfMonth = new Date(year, month - 1, 1);
	const startDate = new Date(contractStartDate);
	return startDate > firstOfMonth;
}
