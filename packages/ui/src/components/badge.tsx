import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/20 text-primary-foreground dark:text-[#FBF8F3] hover:bg-primary/30",
        luxury:
          "gold-gradient text-[#1F1714] font-bold border border-[#E5C378]/60 shadow-[0_2px_8px_rgba(197,168,128,0.3)]",
        gold: "border-[#C5A880]/40 bg-[#C5A880]/15 text-[#8A6A3A] dark:text-[#E5C378] dark:bg-[#D4AF37]/20 dark:border-[#D4AF37]/40",
        cognac:
          "border-[#4A3728]/30 bg-[#4A3728]/10 text-[#4A3728] dark:bg-[#2D211A] dark:border-[#382D26] dark:text-[#D6CCC2]",
        success:
          "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/40",
        warning:
          "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 dark:bg-amber-950/40",
        destructive:
          "border-red-600/30 bg-red-500/10 text-red-800 dark:text-red-400 dark:bg-red-950/40",
        outline: "border-border/70 text-foreground bg-surface/40",
        secondary: "border-transparent bg-muted text-foreground hover:bg-muted/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
