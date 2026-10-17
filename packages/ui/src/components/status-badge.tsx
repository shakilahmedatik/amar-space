import { cn } from "../lib/utils";
import { Badge } from "./badge";

export type StatusVariant =
  | "available"
  | "occupied"
  | "reserved"
  | "cleaning"
  | "maintenance"
  | "vacant"
  | "under_maintenance"
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "adjusted"
  | "overdue"
  | "open"
  | "in_progress"
  | "resolved"
  | "closed"
  | "active"
  | "notice_period"
  | "terminated"
  | "expired"
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  className?: string;
}

function getStatusConfig(status: string) {
  const s = status.toLowerCase();
  switch (s) {
    case "available":
    case "vacant":
    case "paid":
    case "resolved":
    case "active":
    case "confirmed":
    case "checked_in":
      return {
        colorClasses:
          "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/40",
        dotClass: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
      };
    case "adjusted":
      return {
        colorClasses:
          "border-[#C5A880]/40 bg-[#C5A880]/15 text-[#8A6A3A] dark:text-[#E5C378] dark:bg-[#D4AF37]/20",
        dotClass: "bg-[#C5A880] dark:bg-[#E5C378] shadow-[0_0_8px_rgba(197,168,128,0.6)]",
      };
    case "occupied":
    case "reserved":
    case "in_progress":
    case "partially_paid":
    case "pending":
    case "notice_period":
      return {
        colorClasses:
          "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 dark:bg-amber-950/40",
        dotClass: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]",
      };
    case "cleaning":
      return {
        colorClasses:
          "border-sky-600/30 bg-sky-500/10 text-sky-800 dark:text-sky-300 dark:bg-sky-950/40",
        dotClass: "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]",
      };
    case "maintenance":
    case "under_maintenance":
    case "overdue":
    case "cancelled":
    case "terminated":
      return {
        colorClasses:
          "border-rose-600/30 bg-rose-500/10 text-rose-800 dark:text-rose-400 dark:bg-rose-950/40",
        dotClass: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
      };
    default:
      return {
        colorClasses: "border-border/70 bg-surface/50 text-foreground-muted",
        dotClass: "bg-muted-foreground",
      };
  }
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const { colorClasses, dotClass } = getStatusConfig(status);
  const displayLabel = label || status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider border rounded-full capitalize",
        colorClasses,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", dotClass)} aria-hidden="true" />
      {displayLabel}
    </Badge>
  );
}
