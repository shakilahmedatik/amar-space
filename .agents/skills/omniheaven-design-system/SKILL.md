---
name: omniheaven-design-system
description: Strict guidelines, design tokens, component architecture, and aesthetic rules for building UI in omniHeaven. ALWAYS use before creating, modifying, or styling any frontend component, page, or mobile screen. Enforces the Royal Heritage & Champagne palette, Playfair Display + Plus Jakarta Sans typography, Framer Motion luxury easing, and multi-tenant theme compliance.
---

# omniHeaven Design System — AI Agent Directive

> **MANDATORY INSTRUCTION FOR ALL AI CODING AGENTS:**  
> Before writing, modifying, or refactoring ANY user interface file (HTML, CSS, React JSX/TSX, React Native) across `apps/` or `packages/`, you **MUST** read, internalize, and strictly obey this design system. Failure to adhere to these design rules is a critical regression.

---

## 1. Non-Negotiable Core Invariants

### Rule 1: Zero Ad-Hoc Colors (Strictly Forbidden)
- **NEVER** write arbitrary hex codes (e.g., `#1e293b`, `#0f172a`, `#3b82f6`), generic Tailwind color names (`bg-blue-600`, `bg-indigo-500`, `text-slate-900`, `text-gray-500`), or unverified colors in component code.
- **ALWAYS** use the semantic design system classes or `@omniheaven/ui` tokens:
  - Backgrounds: `bg-[hsl(var(--canvas))]`, `bg-card`, `bg-surface`, `bg-surface-elevated`
  - Text: `text-foreground`, `text-foreground-muted`, `text-primary`
  - Borders: `border-border`, `border-border/70`, `gold-hairline`
  - Primary CTAs: `gold-gradient text-[#1F1714]` or `variant="luxury"`
  - Translucent Surfaces: `luxury-glass`

### Rule 2: Single Source of Truth (`@omniheaven/ui`)
- All UI primitives (`Button`, `Card`, `Badge`, `StatusBadge`, `Input`, `Table`, `LuxuryTabs`, `Dialog`, `FadeIn`, etc.) **MUST** be imported directly from `@omniheaven/ui`.
- **NEVER** re-implement custom buttons, cards, or status tags inside application folders (`apps/admin`, `apps/web`, etc.).
- If a new generic primitive is needed, create and export it from `packages/ui` first.

### Rule 3: 100% Light & Dark Mode Parity
Every component and screen must function seamlessly in both polarities with zero visual breakage:
- **Light Theme (Day Pavilion):**
  - Canvas: `#FDFBF7` (Soft Alabaster Cream)
  - Cards: `#FAF6F0` (Warm Ivory Porcelain)
  - Text: `#2A201C` (Deep Roasted Espresso)
  - Muted Text: `#735E54` (Warm Earth)
- **Dark Theme (Night Sanctuary):**
  - Canvas: `#14110F` (Deep Obsidian Espresso)
  - Cards: `#1E1815` (Warm Dark Bronze)
  - Text: `#FBF8F3` (Soft Warm Ivory)
  - Muted Text: `#A8988F` (Warm Sand)

### Rule 4: Strict Typography Hierarchy
- **Grand Headings (`h1`, `h2`, Hero Titles, Suite Names, Brand Marks):**
  - Class: `font-display` or `font-heading` (`Playfair Display`, serif)
  - Tracking: `tracking-tight` or `-0.015em`
- **Dashboard UI, Body, Tables, Navigation & Numbers:**
  - Class: `font-sans` (`Plus Jakarta Sans`)
  - Numbers & Metrics: Always add `tabular-nums` for financial numbers, dates, and flat codes.
- **Bengali Localization (`bn-BD`):**
  - Class: `font-bangla` (`Hind Siliguri`)

### Rule 5: Gold Accenting Restraint
- Champagne Gold (`#C5A880` in light / `#D4AF37` in dark) signifies prestige, verification, and action.
- Use it for:
  - Primary action buttons (`variant="luxury"`)
  - Active tab indicators (`LuxuryTabs`)
  - High-priority metrics and revenue amounts
  - Glowing status dots and hairline borders
- **DO NOT** make full solid gold background pages. Gold must be framed by cream or obsidian canvases.

### Rule 6: Silky Luxury Motion
- Never use bouncy spring animations for luxury business or hospitality interfaces.
- Standard easing: `[0.16, 1, 0.3, 1]` (cubic-bezier) via `luxuryEase` from `@omniheaven/ui`.
- Duration: 200ms to 350ms.
- Micro-interactions:
  - Buttons: `active:scale-[0.98]` tactile press feedback.
  - Interactive cards: `-2px` hover lift with expanding warm ambient shadow (`card-luxury`).
  - Staggered entrances: `StaggerContainer` and `StaggerItem` with 60ms delay per child.

### Rule 7: Mobile-First & Elderly-Friendly
- Minimum interactive touch target: **48px × 48px** (buttons, form inputs, navigation items).
- High-contrast text: WCAG AAA compliance for body copy (contrast ratio ≥ 7:1 against card surface).

---

## 2. Component Quick-Start Catalog

### 2.1 Buttons (`Button`)
```tsx
import { Button } from "@omniheaven/ui";

// 1. Primary Luxury CTA (Gold gradient, subtle glow, dark text)
<Button variant="luxury" size="lg">
  Book Suite Now
</Button>

// 2. Secondary Executive Action (Roasted cognac)
<Button variant="cognac">
  Export Monthly Ledger
</Button>

// 3. Delicate Hairline Outline (Ivory/Bronze glass surface, gold hover)
<Button variant="outline">
  Filter Flat Records
</Button>

// 4. Gold Outline (Champagne border, gold text)
<Button variant="goldOutline">
  View Tenant Contract
</Button>
```

### 2.2 Cards (`Card`)
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@omniheaven/ui";

// 1. Frosted Warm Glass (Translucent blur + champagne hairline)
<Card variant="glass">
  <CardHeader>
    <CardTitle>Overhead Water Maintenance</CardTitle>
    <CardDescription>Scheduled for Friday 9:00 AM - 2:00 PM</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Water supply temporarily diverted to reserve tank.</p>
  </CardContent>
</Card>

// 2. Gold Accent Card (Top gold border highlight)
<Card variant="goldAccent">
  <CardHeader>
    <CardTitle>Advance Security Deposit Ledger</CardTitle>
  </CardHeader>
</Card>

// 3. Interactive Clickable Card (Hover lift -2px with ambient shadow)
<Card variant="interactive" onClick={handleSelect}>
  <CardTitle>Flat 4B — 3 Bed, 3 Bath</CardTitle>
</Card>
```

### 2.3 Status Badges (`StatusBadge`)
```tsx
import { StatusBadge } from "@omniheaven/ui";

// Emits pill-shaped badge with glowing status dot
<StatusBadge status="available" />      // Emerald glowing dot
<StatusBadge status="occupied" />       // Amber glowing dot
<StatusBadge status="adjusted" />       // Champagne gold glowing dot
<StatusBadge status="overdue" />        // Ruby glowing dot
<StatusBadge status="cleaning" />       // Sky blue glowing dot
```

### 2.4 Animated Luxury Tabs (`LuxuryTabs`)
```tsx
import { LuxuryTabs } from "@omniheaven/ui";

const [activeTab, setActiveTab] = useState("overview");

<LuxuryTabs
  items={[
    { id: "overview", label: "Overview", badge: 4 },
    { id: "leases", label: "Active Leases" },
    { id: "finances", label: "Rent & Bills" },
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

### 2.5 Luxury Motion Primitives (`FadeIn`, `InteractiveLuxuryCard`)
```tsx
import { FadeIn, InteractiveLuxuryCard, StaggerContainer, StaggerItem } from "@omniheaven/ui";

<StaggerContainer>
  <StaggerItem>
    <InteractiveLuxuryCard>
      <h3>Presidential Ocean Suite</h3>
    </InteractiveLuxuryCard>
  </StaggerItem>
</StaggerContainer>
```

---

## 3. Mobile App Tokens (React Native / Expo)

When writing code in `apps/mobile`:
```tsx
import { tokens } from "@omniheaven/ui";
import { getMobileTheme } from "../theme";

// Inside screen components:
const theme = getMobileTheme("dark"); // or "light"

<View style={{
  backgroundColor: theme.colors.canvas,
  borderColor: theme.colors.borderGold,
  padding: tokens.spacing[4],
  borderRadius: tokens.radii.xl
}}>
  <Text style={{ fontFamily: "serif", fontSize: 22, color: theme.colors.textPrimary }}>
    omniHeaven Mobile Desk
  </Text>
</View>
```

---

## 4. Pre-Commit Checklist for AI Coding Agents

Before reporting any UI task complete, verify:
- [ ] Are all colors using semantic variables or `@omniheaven/ui` tokens? (Zero arbitrary `#hex` codes)
- [ ] Does the page look stunning in **both Light Mode and Dark Mode**?
- [ ] Are headings rendered with `Playfair Display` (`font-display`) and body text with `Plus Jakarta Sans` (`font-sans`)?
- [ ] Are interactive buttons and cards giving tactile feedback (`active:scale-[0.98]`, `translateY(-2px)`)?
- [ ] Are financial numbers and metrics formatted with `tabular-nums`?
- [ ] Did `bun run check` and `bun run check-types` pass with zero errors?
