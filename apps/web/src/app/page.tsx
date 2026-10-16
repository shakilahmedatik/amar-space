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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 border-b border-indigo-500/30 py-2.5 px-4 text-center text-xs font-semibold text-indigo-100 flex items-center justify-center gap-2">
        <Sparkles className="size-4 text-amber-300 animate-pulse" />
        <span>
          Grand Commercial Launch: 6 Months Completely Free Trial • Zero Payment Hassle • No Credit
          Card Required
        </span>
      </div>

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-extrabold text-white shadow-lg shadow-indigo-500/20">
              OH
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">Omni Heaven</span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-indigo-400 block">
                Property & Hospitality OS
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">
              Platform Features
            </a>
            <a href="#hotel-edition" className="hover:text-white transition-colors">
              Hotels & Resorts
            </a>
            <a href="#building-edition" className="hover:text-white transition-colors">
              Buildings & Flats
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing (6-Mo Free)
            </a>
            <a href="#infrastructure" className="hover:text-white transition-colors">
              Cloud Infrastructure
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3000"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition-colors"
            >
              Sign In
            </a>
            <a
              href="http://localhost:3000"
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 overflow-hidden">
          {/* Ambient Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-600/20 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 text-center space-y-8 relative z-10">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-xs font-semibold text-indigo-300 shadow-inner">
              <Sparkles className="size-3.5 text-amber-400" />
              <span>Commercial Monorepo SaaS Platform</span>
              <span className="text-slate-600">|</span>
              <span className="text-white font-bold">180 Days Free</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              The Operating System for Modern{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                Hotels, Resorts & Buildings
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
              Shopify-style website builder, custom subdomains, zero-commission booking engine, and
              mobile app for Hotel & Resort owners. Automated monthly billing, tenant portals, and
              digital notices for residential Building owners.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <a
                href="http://localhost:3000"
                className="px-8 py-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/40 transition-all active:scale-95 flex items-center gap-2"
              >
                <span>Launch Your Property (6 Months Free)</span>
                <ArrowRight className="size-4" />
              </a>
              <a
                href="http://localhost:3003"
                target="_blank"
                rel="noreferrer"
                className="px-6 py-4 rounded-xl text-sm font-bold text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2"
              >
                <Globe className="size-4 text-indigo-400" />
                <span>View Live Hotel Website Demo</span>
              </a>
            </div>

            {/* Guarantee Trust Checklist */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-400" />
                No credit card needed
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-400" />
                Paystation & bKash ready
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-400" />
                Unlimited staff & renters
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-400" />
                Self-hosted high-speed privacy
              </span>
            </div>
          </div>
        </section>

        {/* Dual-Product Feature Tabs */}
        <section id="features" className="py-20 bg-slate-900/50 border-y border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                Tailored for Your Property Model
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Two Specialized Platforms. One Unified Dashboard.
              </h2>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Whether you manage a 5-star beachfront resort in Inani or a multi-unit apartment
                tower in Dhaka, Omni Heaven equips you with industry-specific workflows.
              </p>

              {/* Tab Switcher */}
              <div className="pt-4 flex items-center justify-center">
                <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveProductTab("hotel")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      activeProductTab === "hotel"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Hotel className="size-4" />
                    <span>Hotel & Resort Edition</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProductTab("building")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      activeProductTab === "building"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Building2 className="size-4" />
                    <span>Building & Flat Edition</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Hotel / Resort Feature Grid */}
            {activeProductTab === "hotel" && (
              <div id="hotel-edition" className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="size-12 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <Globe className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Shopify-Style Website Builder</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Choose from 4 pre-designed luxury themes (Classic Luxury, Modern Minimal,
                    Coastal Resort, Boutique Haven). Customize colors, typography, hero media, and
                    section layout with instant live desktop/mobile preview.
                  </p>
                  <div className="pt-2 text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                    <span>Includes Custom Subdomain or Domain CNAME</span>
                  </div>
                </div>

                <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="size-12 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <CreditCard className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    0% Commission Direct Booking Engine
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Stop paying 15-25% commissions to OTAs. Accept direct bookings with automated
                    room inventory management, pricing tiers, and integrated payment gateways
                    (Paystation, bKash, Nagad, Stripe).
                  </p>
                  <div className="pt-2 text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                    <span>Instant printable PDF confirmation vouchers</span>
                  </div>
                </div>

                <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="size-12 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <Smartphone className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Manager Mobile App & QR Check-In</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Empower front-desk and housekeeping teams with instant mobile notifications for
                    arrivals, room status toggling (Available, Cleaning, Maintenance), and guest
                    identity verification.
                  </p>
                  <div className="pt-2 text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                    <span>iOS and Android manager dashboard</span>
                  </div>
                </div>
              </div>
            )}

            {/* Building / Flat Feature Grid */}
            {activeProductTab === "building" && (
              <div id="building-edition" className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="size-12 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Receipt className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Automated Monthly Bill Generation
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automatically generate itemized monthly rent bills (Base Rent, Water, Gas,
                    Service Charge, Electricity) on the 1st of every month with automated SMS/email
                    payment reminders.
                  </p>
                  <div className="pt-2 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <span>Direct bKash / Paystation payment collections</span>
                  </div>
                </div>

                <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="size-12 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Users className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Dedicated Renter Portal</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Renters log in using their flat access code to review past invoices, download
                    official receipts, view landlord building notices, and check emergency numbers.
                  </p>
                  <div className="pt-2 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <span>Live portal at renter.omniheaven.com</span>
                  </div>
                </div>

                <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="size-12 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Wrench className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Maintenance Ticketing Workflow</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Renters file maintenance issues (plumbing, electrical, AC) with photos and
                    urgency ratings. Building managers assign technicians and update resolution
                    statuses in real time.
                  </p>
                  <div className="pt-2 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <span>Full history of building repairs & costs</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 6 Months Free Trial Transparency Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 text-center space-y-8">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Zero Risk Guarantee
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Why We Give 6 Months Free
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              We know building owners and hoteliers hesitate to switch management software because
              of painful onboarding and upfront charges. We are so confident Omni Heaven will save
              you hours of manual work and boost your revenue that you pay nothing for 180 days.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-left">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-2xl font-bold text-indigo-400 font-mono">1. Register</span>
                <h4 className="text-sm font-bold text-white">Instant Setup in 3 Minutes</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Name your property, pick your custom subdomain, and immediately access your full
                  admin dashboard.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-2xl font-bold text-purple-400 font-mono">2. Enjoy</span>
                <h4 className="text-sm font-bold text-white">180 Days Full Pro Access</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  All features unlocked: Website Builder, Renter Portal, direct bookings,
                  multi-staff roles, zero commissions.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-2xl font-bold text-pink-400 font-mono">3. Decide</span>
                <h4 className="text-sm font-bold text-white">Subscribe Only If You Love It</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  After 6 months, seamlessly renew on a transparent monthly plan or export your data
                  anytime. No lock-in.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Calculator Section */}
        <section id="pricing" className="py-20 bg-slate-900/50 border-t border-slate-800/80">
          <div className="max-w-4xl mx-auto px-4 space-y-10">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                Transparent Pricing
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Calculate Your Post-Trial Investment
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Remember: the first 6 months are 100% free regardless of unit count!
              </p>
            </div>

            {/* Calculator Card */}
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="pricing-units"
                      className="flex items-center justify-between text-xs font-bold text-slate-300"
                    >
                      <span>Number of Rooms / Flats</span>
                      <span className="text-sm text-indigo-400 font-mono">{roomCount} Units</span>
                    </label>
                    <input
                      id="pricing-units"
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      value={roomCount}
                      onChange={(e) => setRoomCount(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>5 units</span>
                      <span>50 units</span>
                      <span>100 units</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-300" />
                      Days 1 – 180 (First 6 Months):
                    </p>
                    <p className="text-lg font-bold text-white">৳0 / Completely Free</p>
                  </div>
                </div>

                {/* Result Column */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Post-Trial Plan (Month 7 onward)
                  </span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold text-white">
                      ৳{baseMonthlyPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    Or save 20% with annual prepayment (৳
                    {Math.round(baseMonthlyPrice * 0.8).toLocaleString()}/mo)
                  </p>
                  <a
                    href="http://localhost:3000"
                    className="w-full py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors inline-block"
                  >
                    Start Free 6 Months Now
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Infrastructure & Security Section */}
        <section id="infrastructure" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Modern Self-Hosted Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Enterprise-Grade Performance. Local Data Privacy.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Designed from the ground up for high reliability, zero vendor lock-in, and instant
              local page loads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <ShieldCheck className="size-8 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Self-Hosted PostgreSQL</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Complete data sovereignty with organization-level tenant isolation, Drizzle ORM
                type-safety, and daily automated backups.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <Layers className="size-8 text-indigo-400" />
              <h4 className="text-sm font-bold text-white">SeaweedFS Cloud Storage</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Distributed, Apache 2.0 S3-compatible asset store for rapid photo uploads, receipts,
                and room galleries without recurring S3 costs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <Globe className="size-8 text-purple-400" />
              <h4 className="text-sm font-bold text-white">Cloudflare Edge Tunnel</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sub-second SSL resolution, wildcard subdomain routing (`*.omniheaven.com`), and DDoS
                protection directly into your server.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <CreditCard className="size-8 text-pink-400" />
              <h4 className="text-sm font-bold text-white">Multi-Gateway Payments</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Native support for Paystation, bKash, Nagad, Rocket, and Stripe for international
                guests.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-20 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border-t border-slate-800 text-center">
          <div className="max-w-4xl mx-auto px-4 space-y-6">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to Modernize Your Property?
            </h2>
            <p className="text-sm sm:text-base text-indigo-200 max-w-xl mx-auto leading-relaxed">
              Join leading hotels, resorts, and residential flat owners across Bangladesh on Omni
              Heaven. Zero credit card required to start.
            </p>
            <div className="pt-2">
              <a
                href="http://localhost:3000"
                className="px-8 py-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/50 transition-all active:scale-95 inline-flex items-center gap-2"
              >
                <span>Claim Your 6-Month Free Trial Now</span>
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
              OH
            </div>
            <span className="font-bold text-slate-300">Omni Heaven Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-400">
            <a href="http://localhost:3000" className="hover:text-white transition-colors">
              Admin Dashboard
            </a>
            <a href="http://localhost:3002" className="hover:text-white transition-colors">
              Renter Portal
            </a>
            <a href="http://localhost:3003" className="hover:text-white transition-colors">
              Hotel & Resort Engine
            </a>
            <a href="http://localhost:3001" className="hover:text-white transition-colors">
              Platform SuperAdmin
            </a>
          </div>

          <p>© {new Date().getFullYear()} Omni Heaven. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
