"use client";

import { formatDate } from "../lib/formatters";

interface DateDisplayProps {
  date: Date | string | null | undefined;
  className?: string;
  fallback?: string;
}

export function DateDisplay({ date, className = "", fallback = "—" }: DateDisplayProps) {
  if (!date) return <span className={className}>{fallback}</span>;
  const formatted = formatDate(date);
  return <span className={className}>{formatted || fallback}</span>;
}
