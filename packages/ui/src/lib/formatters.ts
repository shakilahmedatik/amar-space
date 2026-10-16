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

  const [integerPart, decimalPart] = absoluteAmount.toFixed(2).split(".");
  const formattedInteger = applyBangladeshiGrouping(integerPart ?? "0");

  const sign = isNegative ? "-" : "";
  return `${sign}৳${formattedInteger}.${decimalPart}`;
}

function applyBangladeshiGrouping(integerStr: string): string {
  if (integerStr.length <= 3) {
    return integerStr;
  }

  const lastThree = integerStr.slice(-3);
  const remaining = integerStr.slice(0, -3);

  const pairs: string[] = [];
  let i = remaining.length;
  while (i > 0) {
    const start = Math.max(0, i - 2);
    pairs.unshift(remaining.slice(start, i));
    i = start;
  }

  return `${pairs.join(",")},${lastThree}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return "";
  }

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());

  return `${day}/${month}/${year}`;
}
