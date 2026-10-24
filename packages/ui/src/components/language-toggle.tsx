"use client";

import { Languages } from "lucide-react";
import type React from "react";
import { useLanguage } from "./language-provider";

export interface LanguageToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "pill" | "compact";
}

export function LanguageToggle({
  variant = "pill",
  className = "",
  ...props
}: LanguageToggleProps) {
  const { locale, toggleLocale, isBangla } = useLanguage();

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggleLocale}
        aria-label={`Switch to ${isBangla ? "English" : "Bangla"}`}
        className={`size-9 rounded-xl bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] flex items-center justify-center font-bold text-xs text-[hsl(var(--foreground))] transition-all active:scale-95 cursor-pointer shadow-2xs ${className}`}
        {...props}
      >
        <span className={isBangla ? "font-bangla font-bold text-[hsl(var(--primary))]" : ""}>
          {isBangla ? "বাং" : "EN"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={`Switch to ${isBangla ? "English" : "Bangla"}`}
      className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] text-xs font-semibold cursor-pointer shadow-2xs transition-all active:scale-95 ${className}`}
      {...props}
    >
      <div className="flex items-center gap-1 px-1.5 py-0.5 text-[hsl(var(--foreground-muted))]">
        <Languages className="size-3.5 text-[hsl(var(--primary))]" />
      </div>
      <div className="flex items-center gap-0.5 bg-[hsl(var(--surface-elevated))] rounded-lg p-0.5 border border-[hsl(var(--border))]">
        <span
          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
            locale === "en"
              ? "bg-[hsl(var(--primary))] text-[#1F1714] shadow-xs"
              : "text-[hsl(var(--foreground-muted))]"
          }`}
        >
          EN
        </span>
        <span
          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all font-bangla ${
            locale === "bn"
              ? "bg-[hsl(var(--primary))] text-[#1F1714] shadow-xs"
              : "text-[hsl(var(--foreground-muted))]"
          }`}
        >
          বাংলা
        </span>
      </div>
    </button>
  );
}
