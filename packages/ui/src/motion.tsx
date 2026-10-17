"use client";

import { type HTMLMotionProps, motion } from "framer-motion";
import * as React from "react";
import { cn } from "./lib/utils";

export const luxuryEase = [0.16, 1, 0.3, 1] as const;

export interface FadeInProps extends HTMLMotionProps<"div"> {
  delay?: number;
  duration?: number;
  distance?: number;
}

/**
 * Silky fade-in-up entrance with luxury cubic-bezier easing.
 */
export const FadeIn = React.forwardRef<HTMLDivElement, FadeInProps>(
  ({ className, children, delay = 0, duration = 0.35, distance = 8, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: distance }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -distance }}
        transition={{ duration, delay, ease: luxuryEase }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
FadeIn.displayName = "FadeIn";

export interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  staggerDelay?: number;
}

/**
 * Orchestrated container for cascading item appearances.
 */
export const StaggerContainer = React.forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ className, children, staggerDelay = 0.06, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: {
              staggerChildren: staggerDelay,
            },
          },
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
StaggerContainer.displayName = "StaggerContainer";

export const StaggerItem = React.forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={{
          hidden: { opacity: 0, y: 10 },
          show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.35, ease: luxuryEase },
          },
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
StaggerItem.displayName = "StaggerItem";

export interface InteractiveLuxuryCardProps extends HTMLMotionProps<"div"> {
  enableLift?: boolean;
}

/**
 * Card with tactile luxury micro-lift (-2px) on hover and soft press feedback.
 */
export const InteractiveLuxuryCard = React.forwardRef<HTMLDivElement, InteractiveLuxuryCardProps>(
  ({ className, children, enableLift = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={
          enableLift ? { y: -2, transition: { duration: 0.2, ease: luxuryEase } } : undefined
        }
        whileTap={{ scale: 0.99, transition: { duration: 0.1 } }}
        className={cn(
          "luxury-glass card-luxury rounded-xl border p-6 transition-colors",
          className,
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
InteractiveLuxuryCard.displayName = "InteractiveLuxuryCard";
