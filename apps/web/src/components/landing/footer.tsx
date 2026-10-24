"use client";

import { useLanguage } from "@omniheaven/ui";
import Link from "next/link";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-[hsl(var(--surface))] border-t border-[hsl(var(--border))] py-14 text-[hsl(var(--foreground-muted))] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Info (2 cols) */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-gradient-to-br from-[#C5A880] to-[#9E7D47] text-[#1F1714] flex items-center justify-center font-serif font-bold text-base shadow-sm border border-[#D8C29D]">
                OH
              </div>
              <div>
                <span className="text-base font-serif font-bold text-[hsl(var(--foreground))] block">
                  omniHeaven
                </span>
                <span className="text-[10px] tracking-widest uppercase font-semibold text-[hsl(var(--primary))] block">
                  Luxury Hospitality &amp; Estate OS
                </span>
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--foreground-secondary))] max-w-sm leading-relaxed">
              {t(
                "footer.desc",
                "The unified operating system for 5-star hotels, boutique resorts, and premium residential towers. Combining Swiss operational precision with Aman-inspired hospitality serenity.",
              )}
            </p>
            <div className="flex items-center gap-3 text-[11px] font-mono text-[hsl(var(--foreground-muted))]">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>
                {t("footer.cloudStatus", "Sovereign Cloud Core: All Systems Operational")}
              </span>
            </div>
          </div>

          {/* Column 1: Monorepo Portals */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[hsl(var(--foreground))]">
              {t("footer.colWorkspaces", "Monorepo Workspaces")}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="http://localhost:3000"
                  className="hover:text-[hsl(var(--primary))] transition-colors"
                >
                  Admin Property Manager (:3000)
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3002"
                  className="hover:text-[hsl(var(--primary))] transition-colors"
                >
                  Resident &amp; Renter Portal (:3002)
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3003"
                  className="hover:text-[hsl(var(--primary))] transition-colors"
                >
                  Hotel &amp; Resort Engine (:3003)
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3001"
                  className="hover:text-[hsl(var(--primary))] transition-colors"
                >
                  SuperAdmin Platform HQ (:3001)
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Platform Modules */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[hsl(var(--foreground))]">
              {t("footer.colModules", "Specialized Modules")}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#features" className="hover:text-[hsl(var(--primary))] transition-colors">
                  {t("bento.card1Title", "0% Direct Booking Engine")}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[hsl(var(--primary))] transition-colors">
                  {t("bento.card2Title", "Boutique Website Builder")}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[hsl(var(--primary))] transition-colors">
                  {t("bento.resCard1Title", "1st-of-Month Utility Ledger")}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[hsl(var(--primary))] transition-colors">
                  {t("bento.card3Title", "Mobile QR Concierge Desk")}
                </a>
              </li>
              <li>
                <a
                  href="#calculator"
                  className="hover:text-[hsl(var(--primary))] transition-colors"
                >
                  {t("calc.tag", "OTA Commission Calculator")}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Governance */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[hsl(var(--foreground))]">
              {t("footer.colTrust", "Compliance & Trust")}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-[hsl(var(--foreground-secondary))]">
                  NBR Certified Tax Ledgers
                </span>
              </li>
              <li>
                <span className="text-[hsl(var(--foreground-secondary))]">
                  bKash Tokenized Merchant API
                </span>
              </li>
              <li>
                <span className="text-[hsl(var(--foreground-secondary))]">
                  SeaweedFS Local S3 Storage
                </span>
              </li>
              <li>
                <span className="text-[hsl(var(--foreground-secondary))]">
                  Self-Hosted PostgreSQL Schemas
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Rights */}
        <div className="pt-8 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[hsl(var(--foreground-muted))]">
          <p>
            © {new Date().getFullYear()}{" "}
            {t(
              "footer.rights",
              "omniHeaven OS. All rights reserved. Sovereign Real Estate Operating Systems.",
            )}
          </p>
          <div className="flex items-center gap-6">
            <Link href="#cockpit" className="hover:text-[hsl(var(--primary))] transition-colors">
              {t("nav.liveConsole", "Live Console")}
            </Link>
            <Link href="#calculator" className="hover:text-[hsl(var(--primary))] transition-colors">
              {t("nav.calculator", "Investment Calculator")}
            </Link>
            <Link
              href="#sovereignty"
              className="hover:text-[hsl(var(--primary))] transition-colors"
            >
              {t("nav.sovereignty", "Data Privacy Charter")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
