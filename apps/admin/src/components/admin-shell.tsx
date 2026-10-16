"use client";

import { Badge, Button } from "@omniheaven/ui";
import type { ProductType } from "@omniheaven/validators";
import { Building2, ChevronDown, Hotel, LogOut, Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { DashboardOverviewView } from "./dashboard-overview-view";
import { LanguageToggle } from "./language-toggle";
import { getNavItemsForProductType } from "./navigation-items";
import { WebsiteBuilderView } from "./website-builder-view";

interface AdminShellProps {
  initialLocale: "en" | "bn";
}

export function AdminShell({ initialLocale }: AdminShellProps) {
  // Demo active organization state: toggle between Hotel and Building to experience both!
  const [productType, setProductType] = useState<ProductType>("hotel");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);

  const orgName =
    productType === "hotel" ? "Grand Haven Luxury Resort" : "Lakeview Residence Tower";
  const orgSlug = productType === "hotel" ? "grand-haven" : "lakeview-tower";

  const navItems = getNavItemsForProductType(productType);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col antialiased">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 h-9 w-9"
          >
            {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>

          {/* App Branding */}
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm">
              Ω
            </span>
            <div className="hidden sm:block">
              <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-sm">
                Omni Heaven
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5 font-medium">
                Unified Property Platform
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:border-slate-800 hidden sm:block mx-1" />

          {/* Organization / Property Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <span className="size-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                {productType === "hotel" || productType === "resort" ? (
                  <Hotel className="size-3.5" />
                ) : (
                  <Building2 className="size-3.5" />
                )}
              </span>
              <div className="max-w-[140px] sm:max-w-[180px] truncate">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                  {orgName}
                </p>
                <p className="text-[10px] text-slate-400 capitalize truncate">
                  {productType} Mode · Switch
                </p>
              </div>
              <ChevronDown className="size-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {propertyDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 z-50 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Switch Active Property
                </p>

                <button
                  onClick={() => {
                    setProductType("hotel");
                    setPropertyDropdownOpen(false);
                    setActiveTab("overview");
                  }}
                  type="button"
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left text-xs transition-colors ${
                    productType === "hotel"
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Hotel className="size-4 text-indigo-600" />
                  <div>
                    <p className="font-semibold">Grand Haven Luxury Resort</p>
                    <p className="text-[10px] text-slate-400">Hotel / Resort Edition</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProductType("building");
                    setPropertyDropdownOpen(false);
                    setActiveTab("overview");
                  }}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left text-xs transition-colors ${
                    productType === "building"
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Building2 className="size-4 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Lakeview Residence Tower</p>
                    <p className="text-[10px] text-slate-400">Building / Flat Edition</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* 6-Month Free Trial Pill */}
          <Badge
            variant="outline"
            className="hidden md:flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold px-2.5 py-1"
          >
            <Sparkles className="size-3 text-emerald-500" />
            6-Month Free Trial Active
          </Badge>

          {/* Bilingual Language Switcher (EN / BN) */}
          <LanguageToggle currentLocale={initialLocale} />

          {/* User Profile Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="size-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center shadow-xs">
              SA
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex">
        {/* Dynamic Sidebar */}
        <aside
          className={`fixed lg:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 transition-transform lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          } flex flex-col justify-between p-4`}
        >
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                {productType === "hotel" || productType === "resort"
                  ? "Hospitality Operations"
                  : "Residential Management"}
              </p>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.defaultLabel}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px]">
              <p className="font-semibold text-slate-900 dark:text-white">Active Plan: Pro</p>
              <p className="text-slate-400 text-[10px] mt-0.5">
                Free trial period ends in 172 days.
              </p>
            </div>

            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
            >
              <LogOut className="size-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar backdrop"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-20 lg:hidden backdrop-blur-xs cursor-default"
          />
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === "website-builder" ? (
            <WebsiteBuilderView organizationSlug={orgSlug} organizationName={orgName} />
          ) : (
            <DashboardOverviewView productType={productType} organizationName={orgName} />
          )}
        </main>
      </div>
    </div>
  );
}
