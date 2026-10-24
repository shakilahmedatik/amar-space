"use client";

import { Moon, Sun } from "lucide-react";
import type React from "react";
import { useTheme } from "./theme-provider";

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "icon" | "pill";
}

export function ThemeToggle({ variant = "icon", className = "", ...props }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? "Light" : "Dark"} theme`}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] transition-all active:scale-95 cursor-pointer ${className}`}
        {...props}
      >
        {isDark ? (
          <>
            <Sun className="size-3.5 text-[#E5C378] animate-spin-slow" />
            <span>Day Pavilion</span>
          </>
        ) : (
          <>
            <Moon className="size-3.5 text-[#C5A880]" />
            <span>Night Sanctuary</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "Light" : "Dark"} theme`}
      className={`size-9 rounded-xl bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-all active:scale-95 cursor-pointer shadow-2xs ${className}`}
      {...props}
    >
      {isDark ? (
        <Sun className="size-4 text-[#E5C378] transition-transform hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-[#C5A880] transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
