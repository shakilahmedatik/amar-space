import * as React from "react";
import { cn } from "../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "goldAccent" | "interactive";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantClasses = {
      default:
        "rounded-xl border border-border/70 bg-card text-card-foreground shadow-[0_4px_20px_-4px_rgba(42,32,28,0.04)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] transition-all duration-200",
      glass: "luxury-glass rounded-xl text-card-foreground",
      goldAccent:
        "rounded-xl border border-border/70 border-t-2 border-t-[#C5A880] dark:border-t-[#E5C378] bg-card text-card-foreground shadow-[0_4px_20px_-4px_rgba(42,32,28,0.04)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] transition-all duration-200",
      interactive:
        "card-luxury rounded-xl border border-border/70 bg-card text-card-foreground cursor-pointer",
    };

    return <div ref={ref} className={cn(variantClasses[variant], className)} {...props} />;
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "font-display text-2xl font-semibold leading-none tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-foreground-muted", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
