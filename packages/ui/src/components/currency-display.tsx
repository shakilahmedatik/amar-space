"use client";

import { formatBDT } from "../lib/formatters";

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  large?: boolean;
}

export function CurrencyDisplay({ amount, className = "", large = false }: CurrencyDisplayProps) {
  const formatted = formatBDT(amount);

  return (
    <span
      className={[
        "text-slate-900 dark:text-slate-100 font-semibold tabular-nums",
        large ? "text-xl" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {formatted}
    </span>
  );
}
