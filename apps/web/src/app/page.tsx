"use client";

import { useState } from "react";
import { ActivityTicker } from "@/components/landing/activity-ticker";
import { BentoFeatures } from "@/components/landing/bento-features";
import { CoachMarks } from "@/components/landing/coach-marks";
import { ConciergeDrawer } from "@/components/landing/concierge-drawer";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { Footer } from "@/components/landing/footer";
import { FooterCta } from "@/components/landing/footer-cta";
import { HeroSection } from "@/components/landing/hero-section";
import { InfrastructureGrid } from "@/components/landing/infrastructure-grid";
import { Navbar } from "@/components/landing/navbar";
import { RoiCalculator } from "@/components/landing/roi-calculator";
import { ScrollAffix } from "@/components/landing/scroll-affix";
import { ToastProvider } from "@/components/landing/toast-provider";
import { TrialRoadmap } from "@/components/landing/trial-roadmap";

export default function LandingPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-[hsl(var(--canvas))] text-[hsl(var(--foreground))] selection:bg-[hsl(var(--primary))]/30 selection:text-[hsl(var(--foreground))] overflow-x-hidden relative">
        {/* Scroll Progress Bar & Floating Affix / Breadcrumbs / Sticky Triggers */}
        <ScrollAffix
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onStartTour={() => setIsTourActive(true)}
        />

        {/* 1. Header & Announcement Banner */}
        <Navbar
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onStartTour={() => setIsTourActive(true)}
        />

        {/* 2. Main Editorial Content */}
        <main className="flex-1">
          {/* Hero Section & Interactive Product Cockpit Sandbox (with Parallax) */}
          <HeroSection
            onStartTour={() => setIsTourActive(true)}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />

          {/* Real-time Activity Ticker (Infinite Marquee) */}
          <ActivityTicker />

          {/* Dual-Product Interactive Bento Grid (with Lightbox Modal & Progressive Disclosure) */}
          <BentoFeatures />

          {/* Interactive ROI & OTA Commission Savings Calculator */}
          <RoiCalculator />

          {/* Sovereign Enterprise Cloud Infrastructure */}
          <InfrastructureGrid />

          {/* Zero-Risk 180-Day Trial Roadmap */}
          <TrialRoadmap />

          {/* Interactive FAQ Accordion */}
          <FaqAccordion />

          {/* High-Converting Bottom Provisioning CTA */}
          <FooterCta />
        </main>

        {/* 3. Luxury Editorial Footer */}
        <Footer />

        {/* 4. Overlay & Attention Elements */}
        {/* Off-Canvas Slider Concierge Drawer */}
        <ConciergeDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

        {/* Interactive Guided Onboarding Tour / Coach Marks */}
        <CoachMarks isActive={isTourActive} onClose={() => setIsTourActive(false)} />
      </div>
    </ToastProvider>
  );
}
