"use client";

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe,
  Hotel,
  Layers,
  Receipt,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const [activeProductTab, setActiveProductTab] = useState<"hotel" | "building">("hotel");
  const [roomCount, setRoomCount] = useState<number>(20);

  // Calculate pricing
  const baseMonthlyPrice =
    activeProductTab === "hotel"
      ? 2500 + Math.max(0, roomCount - 10) * 100
      : 1500 + Math.max(0, roomCount - 10) * 50;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/30 selection:text-foreground">
      {/* Top Banner */}
      <div className="bg-primary/10 border-b border-border-gold/30 py-2.5 px-4 text-center text-xs font-semibold text-primary flex items-center justify-center gap-2">
        <Sparkles className="size-4 text-primary animate-pulse" />
        <span>
          Royal Heritage Edition Launch: 6 Months Complimentary Access • Zero Setup Fee • No Credit
          Card Required
        </span>
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border-gold/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-serif font-bold text-lg shadow-sm border border-border-gold/40">
              OH
            </div>
            <div>
              <span className="text-xl font-serif font-bold tracking-tight text-foreground block">
                omniHeaven
              </span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-primary block">
                Luxury Hospitality & Estate OS
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-foreground-muted">
            <a href="#features" className="hover:text-primary transition-colors">
              Platform Modules
            </a>
            <a href="#hotel-edition" className="hover:text-primary transition-colors">
              Hotels & Resorts
            </a>
            <a href="#building-edition" className="hover:text-primary transition-colors">
              Residential Estates
            </a>
            <a href="#pricing" className="hover:text-primary transition-colors">
              Investment Calculator
            </a>
            <a href="#infrastructure" className="hover:text-primary transition-colors">
              Enterprise Cloud
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3000"
              className="text-xs font-semibold text-foreground-muted hover:text-foreground px-3 py-2 rounded-lg hover:bg-surface transition-colors"
            >
              Sign In
            </a>
            <a
              href="http://localhost:3000"
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:brightness-110 shadow-sm border border-border-gold/40 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>Begin Free Trial</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 overflow-hidden">
          {/* Ambient Champagne Mesh Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[750px] h-[360px] bg-gradient-to-tr from-primary/15 via-amber-500/10 to-primary/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 text-center space-y-8 relative z-10">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-border-gold/40 text-xs font-semibold text-primary shadow-2xs">
              <Sparkles className="size-3.5 text-primary" />
              <span>Multi-Tenant Hospitality & Real Estate Monorepo</span>
              <span className="text-foreground-muted/40">|</span>
              <span className="text-foreground font-bold">180 Days Complimentary</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold tracking-tight text-foreground leading-[1.1]">
              The Operating System for Prestigious{" "}
              <span className="text-primary italic">Hotels, Resorts & Residential Towers</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl text-foreground-muted max-w-3xl mx-auto font-sans leading-relaxed">
              Curated boutique website builder, bespoke subdomains, zero-commission booking engine,
              and native mobile apps for luxury hoteliers. Automated monthly utility ledgers, tenant
              portals, and certified security audits for estate owners.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <a
                href="http://localhost:3000"
                className="px-8 py-4 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 shadow-md border border-border-gold/40 transition-all active:scale-95 flex items-center gap-2"
              >
                <span>Provision Your Property (6 Months Free)</span>
                <ArrowRight className="size-4" />
              </a>
              <a
                href="http://localhost:3003"
                target="_blank"
                rel="noreferrer"
                className="px-6 py-4 rounded-xl text-sm font-bold text-foreground bg-card border border-border-gold/30 hover:bg-surface hover:border-border-gold/60 transition-all flex items-center gap-2 shadow-xs"
              >
                <Globe className="size-4 text-primary" />
                <span>Experience Live Guest Engine Demo</span>
              </a>
            </div>

            {/* Guarantee Trust Checklist */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-foreground-muted font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" />
                Zero credit card needed
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" />
                Paystation & bKash native integration
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" />
                Unlimited staff governance & roles
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" />
                Self-hosted high-speed privacy
              </span>
            </div>
          </div>
        </section>

        {/* Dual-Product Feature Tabs */}
        <section id="features" className="py-20 bg-surface/40 border-y border-border-gold/25">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Precision Tailored Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
                Two Specialized Platforms. One Harmonious Dashboard.
              </h2>
              <p className="text-sm sm:text-base text-foreground-muted leading-relaxed">
                Whether overseeing a 5-star beachfront resort in Cox's Bazar or an executive
                apartment residence in Gulshan, omniHeaven delivers bespoke industry workflows.
              </p>

              {/* Tab Switcher */}
              <div className="pt-4 flex items-center justify-center">
                <div className="p-1 rounded-2xl bg-card border border-border-gold/30 flex gap-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setActiveProductTab("hotel")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      activeProductTab === "hotel"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    <Hotel className="size-4" />
                    <span>Hotel & Resort Edition</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProductTab("building")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      activeProductTab === "building"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    <Building2 className="size-4" />
                    <span>Building & Residential Edition</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Hotel / Resort Feature Grid */}
            {activeProductTab === "hotel" && (
              <div id="hotel-edition" className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-4 hover:border-border-gold/60 transition-all">
                  <div className="size-12 rounded-xl bg-primary/10 border border-border-gold/30 text-primary flex items-center justify-center">
                    <Globe className="size-6" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-foreground">
                    Luxury Website Builder
                  </h3>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    Select from 4 curated boutique themes (Classic Luxury, Modern Minimal, Coastal
                    Resort, Boutique Haven). Harmonize brand colors, typography, hero media, and
                    room showcases with real-time responsive previews.
                  </p>
                  <div className="pt-2 text-[11px] font-semibold text-primary flex items-center gap-1">
                    <span>Includes Custom Subdomain or Domain CNAME</span>
                  </div>
                </div>

                <div className="p-8 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-4 hover:border-border-gold/60 transition-all">
                  <div className="size-12 rounded-xl bg-primary/10 border border-border-gold/30 text-primary flex items-center justify-center">
                    <CreditCard className="size-6" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-foreground">
                    0% Commission Direct Booking
                  </h3>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    Eliminate punitive 15-25% OTA commissions. Accept direct guest bookings with
                    automated inventory matrices, seasonal pricing rules, and integrated Bangladeshi
                    & global gateways (Paystation, bKash, Nagad, Stripe).
                  </p>
                  <div className="pt-2 text-[11px] font-semibold text-primary flex items-center gap-1">
                    <span>Instant printable PDF confirmation vouchers</span>
                  </div>
                </div>

                <div className="p-8 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-4 hover:border-border-gold/60 transition-all">
                  <div className="size-12 rounded-xl bg-primary/10 border border-border-gold/30 text-primary flex items-center justify-center">
                    <Smartphone className="size-6" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-foreground">
                    Manager Mobile App & QR Check-In
                  </h3>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    Equip front-desk and housekeeping teams with instant mobile push alerts for
                    arrivals, room status switches (Available, Cleaning, Maintenance), and biometric
                    tenant verifications.
                  </p>
                  <div className="pt-2 text-[11px] font-semibold text-primary flex items-center gap-1">
                    <span>iOS and Android concierge workspace</span>
                  </div>
                </div>
              </div>
            )}

            {/* Building / Flat Feature Grid */}
            {activeProductTab === "building" && (
              <div id="building-edition" className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-4 hover:border-border-gold/60 transition-all">
                  <div className="size-12 rounded-xl bg-primary/10 border border-border-gold/30 text-primary flex items-center justify-center">
                    <Receipt className="size-6" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-foreground">
                    Automated Monthly Bill Generation
                  </h3>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    Auto-generate itemized monthly rent statements (Base Rent, Water, Gas, Service
                    Charge, Electricity) on the 1st of every month with automated SMS/email payment
                    notifications.
                  </p>
                  <div className="pt-2 text-[11px] font-semibold text-primary flex items-center gap-1">
                    <span>Direct bKash / Paystation automated reconciliation</span>
                  </div>
                </div>

                <div className="p-8 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-4 hover:border-border-gold/60 transition-all">
                  <div className="size-12 rounded-xl bg-primary/10 border border-border-gold/30 text-primary flex items-center justify-center">
                    <Users className="size-6" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-foreground">
                    Dedicated Tenant Portal
                  </h3>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    Tenants log in using their flat access code to review past statements, download
                    official tax receipts, review landlord advisories, and access emergency
                    caretaker contacts.
                  </p>
                  <div className="pt-2 text-[11px] font-semibold text-primary flex items-center gap-1">
                    <span>Live portal at renter.omniheaven.com</span>
                  </div>
                </div>

                <div className="p-8 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-4 hover:border-border-gold/60 transition-all">
                  <div className="size-12 rounded-xl bg-primary/10 border border-border-gold/30 text-primary flex items-center justify-center">
                    <Wrench className="size-6" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-foreground">
                    Maintenance Ticketing Workflow
                  </h3>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    Tenants report facility issues (plumbing, electrical, AC) with photos and
                    urgency ratings. Estate managers dispatch caretakers and record repair expenses
                    in real time.
                  </p>
                  <div className="pt-2 text-[11px] font-semibold text-primary flex items-center gap-1">
                    <span>Complete ledger of repairs & operating expenses</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 6 Months Free Trial Transparency Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 text-center space-y-8">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Zero Risk Guarantee
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-foreground tracking-tight">
              Why We Provide 6 Months Free
            </h2>
            <p className="text-sm sm:text-base text-foreground-muted max-w-2xl mx-auto leading-relaxed">
              We understand property owners and hoteliers hesitate to adopt new software because of
              cumbersome onboarding and upfront lock-ins. We are confident omniHeaven will
              streamline your operations and maximize your occupancy that you pay nothing for 180
              days.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-left">
              <div className="p-6 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-2">
                <span className="text-2xl font-serif font-bold text-primary">1. Register</span>
                <h4 className="text-sm font-serif font-bold text-foreground">
                  Instant 3-Minute Setup
                </h4>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  Name your estate, reserve your custom subdomain, and immediately unlock your
                  administrative workspace.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-2">
                <span className="text-2xl font-serif font-bold text-primary">2. Experience</span>
                <h4 className="text-sm font-serif font-bold text-foreground">
                  180 Days Full Pro Access
                </h4>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  All enterprise capabilities active: Website Builder, Tenant Portal, direct
                  bookings, team governance, and zero transaction fee markups.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-2">
                <span className="text-2xl font-serif font-bold text-primary">3. Decide</span>
                <h4 className="text-sm font-serif font-bold text-foreground">
                  Renew Only If Thrilled
                </h4>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  After 6 months, seamlessly continue on a transparent monthly subscription or
                  export your forensic ledgers anytime. Zero lock-in.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Calculator Section */}
        <section id="pricing" className="py-20 bg-surface/40 border-t border-border-gold/25">
          <div className="max-w-4xl mx-auto px-4 space-y-10">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Transparent Pricing
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
                Calculate Your Post-Trial Investment
              </h2>
              <p className="text-xs sm:text-sm text-foreground-muted">
                Your first 6 months remain 100% complimentary regardless of unit scale.
              </p>
            </div>

            {/* Calculator Card */}
            <div className="p-8 rounded-3xl bg-card border border-border-gold/30 shadow-lg space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="pricing-units"
                      className="flex items-center justify-between text-xs font-bold text-foreground"
                    >
                      <span>Number of Rooms / Flats</span>
                      <span className="text-sm text-primary font-serif font-bold">
                        {roomCount} Units
                      </span>
                    </label>
                    <input
                      id="pricing-units"
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      value={roomCount}
                      onChange={(e) => setRoomCount(Number(e.target.value))}
                      className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-foreground-muted font-mono">
                      <span>5 units</span>
                      <span>50 units</span>
                      <span>100 units</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/10 border border-border-gold/30 text-xs text-primary space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" />
                      Days 1 – 180 (First 6 Months):
                    </p>
                    <p className="text-xl font-serif font-bold text-foreground">
                      ৳0 / Completely Free
                    </p>
                  </div>
                </div>

                {/* Result Column */}
                <div className="p-6 rounded-2xl bg-surface border border-border-gold/20 text-center space-y-3">
                  <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider block">
                    Post-Trial Plan (Month 7 Onward)
                  </span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-serif font-bold text-foreground tabular-nums">
                      ৳{baseMonthlyPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-foreground-muted">/ month</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Or save 20% with annual prepayment (৳
                    {Math.round(baseMonthlyPrice * 0.8).toLocaleString()}/mo)
                  </p>
                  <a
                    href="http://localhost:3000"
                    className="w-full py-3 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:brightness-110 shadow-sm border border-border-gold/40 transition-all inline-block"
                  >
                    Claim 6 Months Free Access
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Infrastructure & Security Section */}
        <section id="infrastructure" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Enterprise Data Sovereignty
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
              Enterprise Performance. Strict Sovereign Privacy.
            </h2>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Engineered for absolute reliability, zero vendor lock-in, and instantaneous page
              responses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-3">
              <ShieldCheck className="size-8 text-primary" />
              <h4 className="text-sm font-serif font-bold text-foreground">
                Self-Hosted PostgreSQL
              </h4>
              <p className="text-xs text-foreground-muted leading-relaxed">
                Complete data sovereignty with organization-level tenant isolation, Drizzle ORM
                type-safety, and daily automated backups.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-3">
              <Layers className="size-8 text-primary" />
              <h4 className="text-sm font-serif font-bold text-foreground">
                SeaweedFS Cloud Storage
              </h4>
              <p className="text-xs text-foreground-muted leading-relaxed">
                Distributed, Apache 2.0 S3-compatible asset store for rapid photo uploads, receipts,
                and room galleries without external cloud storage surcharges.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-3">
              <Globe className="size-8 text-primary" />
              <h4 className="text-sm font-serif font-bold text-foreground">
                Cloudflare Edge Routing
              </h4>
              <p className="text-xs text-foreground-muted leading-relaxed">
                Sub-second SSL resolution, wildcard subdomain routing (`*.omniheaven.com`), and DDoS
                mitigation straight into your host.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border-gold/30 shadow-xs space-y-3">
              <CreditCard className="size-8 text-primary" />
              <h4 className="text-sm font-serif font-bold text-foreground">
                Multi-Gateway Payments
              </h4>
              <p className="text-xs text-foreground-muted leading-relaxed">
                Native support for Paystation, bKash, Nagad, Rocket, and Stripe for international
                guests.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-20 bg-gradient-to-br from-surface via-card to-primary/10 border-t border-border-gold/30 text-center">
          <div className="max-w-4xl mx-auto px-4 space-y-6">
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-foreground tracking-tight">
              Ready to Transform Your Estate Operations?
            </h2>
            <p className="text-sm sm:text-base text-foreground-muted max-w-xl mx-auto leading-relaxed">
              Join visionary hoteliers and property owners across Bangladesh on omniHeaven. Zero
              credit card required to begin.
            </p>
            <div className="pt-2">
              <a
                href="http://localhost:3000"
                className="px-8 py-4 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 shadow-md border border-border-gold/40 transition-all active:scale-95 inline-flex items-center gap-2"
              >
                <span>Claim Your 6-Month Complimentary Pass</span>
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border-gold/20 py-12 text-foreground-muted text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-serif font-bold text-xs">
              OH
            </div>
            <span className="font-bold text-foreground">omniHeaven Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-foreground-muted">
            <a href="http://localhost:3000" className="hover:text-primary transition-colors">
              Admin Workspace
            </a>
            <a href="http://localhost:3002" className="hover:text-primary transition-colors">
              Renter Portal
            </a>
            <a href="http://localhost:3003" className="hover:text-primary transition-colors">
              Hotel & Resort Engine
            </a>
            <a href="http://localhost:3001" className="hover:text-primary transition-colors">
              Platform SuperAdmin
            </a>
          </div>

          <p>© {new Date().getFullYear()} omniHeaven. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
