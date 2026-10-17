"use client";

import { motion } from "framer-motion";
import type * as React from "react";
import { cn } from "../lib/utils";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export interface LuxuryTabsProps {
  items: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function LuxuryTabs({
  items,
  activeTab,
  onChange,
  className,
  size = "default",
}: LuxuryTabsProps) {
  const sizeClasses = {
    sm: "h-9 text-xs px-3",
    default: "h-10 text-sm px-4",
    lg: "h-12 text-base px-6",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-border/70 bg-card/70 p-1 backdrop-blur-sm shadow-sm",
        className,
      )}
      role="tablist"
    >
      {items.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative z-10 flex items-center gap-2 rounded-lg font-medium transition-colors duration-200 outline-none select-none",
              sizeClasses[size],
              isActive
                ? "text-primary-foreground dark:text-[#14110F] font-semibold"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            {tab.icon && <span className="size-4 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  isActive
                    ? "bg-[#1F1714]/20 text-[#1F1714] dark:bg-[#14110F]/20 dark:text-[#14110F]"
                    : "bg-surface text-foreground-muted",
                )}
              >
                {tab.badge}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="luxuryTabIndicator"
                className="absolute inset-0 z-[-1] rounded-lg gold-gradient shadow-[0_2px_10px_rgba(197,168,128,0.4)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
