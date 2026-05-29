import {
  LandingCtaBanner,
  LandingFeatures,
  LandingFooter,
  LandingHero,
  LandingHowItWorks,
  LandingNavbar,
  LandingPricing,
} from '@/components/landing'

/**
 * AmarSpace public landing page.
 * Replaces the default Turborepo starter page.
 *
 * Sections:
 * 1. Navbar — sticky, transparent-to-white on scroll
 * 2. Hero — headline, CTAs, stat cards
 * 3. Features — 6-card grid
 * 4. How It Works — 3-step process
 * 5. Pricing — Free + Pro tiers
 * 6. CTA Banner — dark, conversion-focused
 * 7. Footer — dark, minimal links
 */
export default function HomePage() {
  return (
    <>
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingPricing />
        <LandingCtaBanner />
      </main>
      <LandingFooter />
    </>
  )
}
