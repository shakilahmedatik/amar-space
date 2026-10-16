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
  | "overdue"
  | "open"
  | "in_progress"
  | "resolved"
  | "closed"
  | "active"
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
          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
        dotClass: "bg-emerald-500",
      };
    case "occupied":
    case "reserved":
    case "in_progress":
    case "partially_paid":
    case "pending":
      return {
        colorClasses: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
        dotClass: "bg-amber-500",
      };
    case "cleaning":
      return {
        colorClasses: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400",
        dotClass: "bg-sky-500",
      };
    case "maintenance":
    case "under_maintenance":
    case "overdue":
    case "cancelled":
    case "terminated":
      return {
        colorClasses: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
        dotClass: "bg-rose-500",
      };
    default:
      return {
        colorClasses: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400",
        dotClass: "bg-slate-400",
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
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border rounded-full capitalize",
        colorClasses,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", dotClass)} aria-hidden="true" />
      {displayLabel}
    </Badge>
  );
}
