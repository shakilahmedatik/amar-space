"use client";

import { sendVerificationEmail, signOut, useSession } from "@omniheaven/auth/client";
import { Badge, Button, UnverifiedEmailBanner, UserProfileMenu } from "@omniheaven/ui";
import { LogOut, Menu, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOrganization } from "../lib/organization-context";
import { AuditLogsView } from "./audit-logs-view";
import { BillingInvoicesView } from "./billing-invoices-view";
import { CreateOrganizationModal } from "./create-organization-modal";
import { DashboardOverviewView } from "./dashboard-overview-view";
import { HotelReservationsView } from "./hotel-reservations-view";
import { HotelRoomsView } from "./hotel-rooms-view";
import { InviteMemberModal } from "./invite-member-modal";
import { LanguageToggle } from "./language-toggle";
import { MaintenanceOperationsView } from "./maintenance-operations-view";
import { getNavItemsForProductType } from "./navigation-items";
import { OrganizationSwitcher } from "./organization-switcher";
import { PropertyHierarchyView } from "./property-hierarchy-view";
import { RenterDirectoryView } from "./renter-directory-view";
import { TeamRolesView } from "./team-roles-view";
import { WebsiteBuilderView } from "./website-builder-view";

interface AdminShellProps {
  initialLocale: "en" | "bn";
}

export function AdminShell({ initialLocale }: AdminShellProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { activeOrg, productType } = useOrganization();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const handleResendVerification = async () => {
    if (!session?.user?.email) return;
    await sendVerificationEmail({ email: session.user.email });
  };

  const navItems = getNavItemsForProductType(productType);

  return (
    <div className="min-h-screen bg-[hsl(var(--canvas))] text-foreground flex flex-col antialiased">
      {/* Unverified Email Warning Banner */}
      {session?.user && !session.user.emailVerified && (
        <UnverifiedEmailBanner email={session.user.email} onResend={handleResendVerification} />
      )}

      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-border bg-card/85 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 h-10 w-10 min-h-[44px] min-w-[44px]"
            aria-label="Toggle Navigation Drawer"
          >
            {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>

          {/* App Branding */}
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-base shadow-sm">
              Ω
            </span>
            <div className="hidden sm:block">
              <span className="font-extrabold text-foreground tracking-tight text-sm">
                Omni Heaven
              </span>
              <span className="text-[10px] text-foreground-muted block -mt-0.5 font-medium">
                Unified Property Platform
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-border hidden sm:block mx-1" />

          {/* Organization Switcher Dropdown & Mobile Drawer */}
          <OrganizationSwitcher />
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* 6-Month Free Trial Pill */}
          <Badge
            variant="gold"
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1"
          >
            <Sparkles className="size-3" />
            6-Month Free Trial Active
          </Badge>

          {/* Bilingual Language Switcher (EN / BN) */}
          <LanguageToggle currentLocale={initialLocale} />

          {/* User Profile Dropdown Menu */}
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <UserProfileMenu
              user={session?.user || { name: "Manager", email: "manager@omniheaven.com" }}
              roleLabel={activeOrg.role}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex">
        {/* Dynamic Sidebar */}
        <aside
          className={`fixed lg:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 border-r border-border bg-card transition-transform lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          } flex flex-col justify-between p-4`}
        >
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted px-3 mb-2">
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
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground-muted hover:bg-surface hover:text-foreground"
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
          <div className="pt-4 border-t border-border space-y-2">
            <div className="p-3 rounded-xl bg-surface border border-border text-[11px]">
              <p className="font-semibold text-foreground">Active Plan: Pro</p>
              <p className="text-foreground-muted text-[10px] mt-0.5">
                Free trial period ends in 172 days.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground-muted hover:text-rose-600 transition-colors min-h-[40px] cursor-pointer"
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
            className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-xs cursor-default"
          />
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === "team" || activeTab === "staff" ? (
            <TeamRolesView />
          ) : activeTab === "website-builder" ? (
            <WebsiteBuilderView
              organizationSlug={activeOrg.slug}
              organizationName={activeOrg.name}
            />
          ) : activeTab === "bookings" ? (
            <HotelReservationsView />
          ) : activeTab === "rooms" ? (
            <HotelRoomsView />
          ) : activeTab === "buildings" ? (
            <PropertyHierarchyView />
          ) : activeTab === "renters" ? (
            <RenterDirectoryView />
          ) : activeTab === "bills" || activeTab === "payments" ? (
            <BillingInvoicesView />
          ) : activeTab === "maintenance" || activeTab === "notices" ? (
            <MaintenanceOperationsView
              initialTab={activeTab === "notices" ? "notices" : "maintenance"}
            />
          ) : activeTab === "audit" ? (
            <AuditLogsView />
          ) : (
            <DashboardOverviewView productType={productType} organizationName={activeOrg.name} />
          )}
        </main>
      </div>

      {/* Global Modals for Organization Creation and Member Invitation */}
      <CreateOrganizationModal />
      <InviteMemberModal />
    </div>
  );
}
