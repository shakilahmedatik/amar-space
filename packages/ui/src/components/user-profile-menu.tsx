"use client";

import { ChevronDown, LogOut, Shield } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";
import { Badge } from "./badge";

export interface UserProfileMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    globalRole?: string | null;
  };
  roleLabel?: string;
  onSignOut: () => void | Promise<void>;
  className?: string;
}

export function UserProfileMenu({ user, roleLabel, onSignOut, className }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const displayName = user.name || user.email?.split("@")[0] || "User";
  const displayEmail = user.email || "";

  // Derive initials
  const initials = React.useMemo(() => {
    if (!user.name) {
      return (user.email?.[0] || "U").toUpperCase();
    }
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) {
      return (parts[0]?.[0] || "U").toUpperCase();
    }
    return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
  }, [user.name, user.email]);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOutClick = async () => {
    setIsSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2.5 p-1 rounded-full sm:rounded-lg hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
      >
        <div className="size-8 rounded-full bg-gradient-to-br from-[#FAF6F0] to-[#EAE0D2] dark:from-[#251E1A] dark:to-[#171311] border border-[#C5A880]/50 text-foreground font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
          {initials}
        </div>
        <div className="hidden md:flex flex-col text-left mr-1">
          <span className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]">
            {displayName}
          </span>
          <span className="text-[10px] text-foreground-muted leading-tight truncate max-w-[120px]">
            {roleLabel || user.globalRole || "Member"}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 text-foreground-muted transition-transform duration-200 hidden sm:block",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-border/70 bg-card p-2 text-foreground shadow-xl shadow-black/10 z-50 backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* User Details Header */}
          <div className="p-2 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-full bg-[#FAF6F0] dark:bg-[#251E1A] border border-[#C5A880]/60 text-foreground font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                <p className="text-[11px] text-foreground-muted truncate">{displayEmail}</p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] uppercase font-semibold px-2 py-0.5">
                {roleLabel || user.globalRole || "Member"}
              </Badge>
              {user.globalRole === "superadmin" && (
                <span className="flex items-center gap-1 text-[10px] text-[#9E7D47] dark:text-[#E5C378] font-bold">
                  <Shield className="size-3" />
                  HQ SuperAdmin
                </span>
              )}
            </div>
          </div>

          {/* Action List */}
          <div className="p-1 space-y-0.5">
            <button
              type="button"
              role="menuitem"
              disabled={isSigningOut}
              onClick={handleSignOutClick}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="size-3.5" />
              <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
