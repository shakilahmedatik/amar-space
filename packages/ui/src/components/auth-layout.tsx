"use client";

import type * as React from "react";
import { cn } from "../lib/utils";
import { Badge } from "./badge";
import { Card } from "./card";

export interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  className?: string;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  badge = "omniHeaven Platform",
  className,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[hsl(var(--canvas))] text-foreground relative overflow-hidden select-none">
      {/* Ambient background glowing orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#C5A880]/10 dark:bg-[#E5C378]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#C5A880]/10 dark:bg-[#E5C378]/5 rounded-full blur-3xl pointer-events-none" />

      <div className={cn("w-full max-w-md space-y-6 relative z-10", className)}>
        {/* Branding & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex size-14 rounded-2xl bg-gradient-to-br from-primary to-[#8C6D3F] text-primary-foreground items-center justify-center font-display font-black text-2xl shadow-xl shadow-primary/20 border border-[#C5A880]/40 mb-1">
            Ω
          </div>
          <div>
            <Badge
              variant="outline"
              className="text-[10px] tracking-widest uppercase font-bold text-[#9E7D47] dark:text-[#E5C378] border-[#C5A880]/40 px-2.5 py-0.5"
            >
              {badge}
            </Badge>
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-xs text-foreground-muted max-w-sm mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Card Container */}
        <Card className="p-6 sm:p-8 border border-border/80 shadow-2xl shadow-black/5 bg-card/95 backdrop-blur-md rounded-2xl">
          {children}
        </Card>

        {/* Footer info */}
        <div className="text-center text-[11px] text-foreground-muted">
          <span>Protected by Enterprise TLS & Argon2id/Scrypt Security</span>
          <span className="block mt-1 font-medium opacity-80">
            © {new Date().getFullYear()} omniHeaven. All rights reserved.
          </span>
        </div>
      </div>
    </div>
  );
}
