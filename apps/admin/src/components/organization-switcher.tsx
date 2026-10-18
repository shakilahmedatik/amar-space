"use client";

import { Badge, Button } from "@omniheaven/ui";
import type { ProductType } from "@omniheaven/validators";
import { Building2, Check, ChevronDown, Hotel, Palmtree, Plus, Store, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useOrganization } from "../lib/organization-context";

function getProductIcon(productType: ProductType) {
  switch (productType) {
    case "hotel":
      return Hotel;
    case "building":
      return Building2;
    case "resort":
      return Palmtree;
    case "commercial":
      return Store;
    default:
      return Building2;
  }
}

export function OrganizationSwitcher() {
  const { organizations, activeOrg, switchOrganization, setCreateModalOpen } = useOrganization();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ActiveIcon = getProductIcon(activeOrg.productType);

  const handleSelect = async (orgId: string) => {
    await switchOrganization(orgId);
    setDropdownOpen(false);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Desktop / Tablet Dropdown Button */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => {
            // On mobile viewports (<768px), open the silky mobile drawer; otherwise toggle dropdown
            if (window.innerWidth < 768) {
              setMobileDrawerOpen(true);
            } else {
              setDropdownOpen(!dropdownOpen);
            }
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border-gold/30 bg-surface/50 hover:bg-surface hover:border-border-gold/50 transition-all text-left min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary/40 group active:scale-[0.98]"
          aria-label="Switch Active Organization"
        >
          <span className="size-8 rounded-lg bg-primary/10 text-primary border border-border-gold/30 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-primary/20 transition-colors">
            <ActiveIcon className="size-4" />
          </span>

          <div className="max-w-[130px] sm:max-w-[190px] truncate text-left">
            <p className="text-xs font-bold text-foreground leading-tight truncate">
              {activeOrg.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-foreground-muted capitalize font-medium">
                {activeOrg.productType}
              </span>
              {activeOrg.role && (
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-surface-elevated text-foreground-muted font-bold tracking-wider border border-border/50">
                  {activeOrg.role}
                </span>
              )}
            </div>
          </div>

          <ChevronDown
            className={`size-4 text-foreground-muted shrink-0 transition-transform duration-200 ${
              dropdownOpen ? "rotate-180 text-foreground" : ""
            }`}
          />
        </button>

        {/* Desktop Dropdown Content */}
        {dropdownOpen && (
          <div className="hidden md:block absolute left-0 mt-2 w-80 bg-card border border-border-gold/30 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in-0 zoom-in-95 duration-150 backdrop-blur-md">
            <div className="px-3 py-2 flex items-center justify-between border-b border-border/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                Your Workspaces ({organizations.length})
              </p>
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-1.5 text-primary border-primary/30"
              >
                Multi-Tenant
              </Badge>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 p-1">
              {organizations.map((org) => {
                const OrgIcon = getProductIcon(org.productType);
                const isActive = org.id === activeOrg.id;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSelect(org.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all min-h-[48px] ${
                      isActive
                        ? "bg-primary/10 text-foreground font-semibold border border-primary/30 shadow-2xs"
                        : "hover:bg-surface text-foreground-muted hover:text-foreground border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-primary text-primary-foreground font-bold"
                            : "bg-surface border border-border text-foreground-muted"
                        }`}
                      >
                        <OrgIcon className="size-3.5" />
                      </span>
                      <div className="min-w-0 truncate">
                        <p className="font-bold text-xs truncate leading-snug">{org.name}</p>
                        <p className="text-[10px] text-foreground-muted capitalize">
                          {org.productType} Edition {org.role ? `· ${org.role}` : ""}
                        </p>
                      </div>
                    </div>
                    {isActive && <Check className="size-4 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {/* Create New Org Action Button */}
            <div className="pt-2 border-t border-border/50 p-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDropdownOpen(false);
                  setCreateModalOpen(true);
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 text-xs font-semibold hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Plus className="size-3.5" />
                Create New Property Workspace
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Drawer (Viewports < 768px) with Touch Target ≥ 48px */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close organization drawer"
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Sheet */}
          <div className="relative bg-card border-t border-border-gold/30 rounded-t-3xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-250">
            {/* Drawer Handle & Header */}
            <div className="flex items-center justify-between pb-2 border-b border-border-gold/20">
              <div className="space-y-0.5">
                <p className="text-base font-serif font-bold text-foreground">Switch Workspace</p>
                <p className="text-xs text-foreground-muted">
                  Choose a property to manage or launch a new one
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="size-11 rounded-full bg-surface border border-border flex items-center justify-center text-foreground-muted hover:text-foreground active:scale-95"
                aria-label="Close drawer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* List of Organizations with Touch Targets ≥ 48px */}
            <div className="space-y-2">
              {organizations.map((org) => {
                const OrgIcon = getProductIcon(org.productType);
                const isActive = org.id === activeOrg.id;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSelect(org.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all min-h-[52px] ${
                      isActive
                        ? "bg-primary/15 border-2 border-primary/60 text-foreground font-bold shadow-xs"
                        : "bg-surface/60 border border-border text-foreground hover:bg-surface active:bg-surface-elevated"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : "bg-surface border border-border text-foreground-muted"
                        }`}
                      >
                        <OrgIcon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate leading-snug">{org.name}</p>
                        <p className="text-xs text-foreground-muted capitalize">
                          {org.productType} Edition {org.role ? `· ${org.role}` : ""}
                        </p>
                      </div>
                    </div>
                    {isActive && <Check className="size-5 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {/* Create New Org Button in Mobile Drawer */}
            <div className="pt-2">
              <Button
                variant="luxury"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setCreateModalOpen(true);
                }}
                className="w-full min-h-[52px] flex items-center justify-center gap-2 text-sm font-bold shadow-md"
              >
                <Plus className="size-4" />
                Create New Property Workspace
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
