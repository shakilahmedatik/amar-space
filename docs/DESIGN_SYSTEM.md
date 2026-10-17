# omniHeaven — Master Design System Specification

> **Brand Vision:** Elevated Hospitality, Royal Living & Enterprise Real Estate Precision  
> **Aesthetic Theme:** Royal Heritage & Champagne (Alabaster Cream, Warm Champagne Gold, Roasted Espresso & Cognac)  
> **Platform Coverage:** Web Monorepo (Next.js 16 + Tailwind v4 + Radix) & Mobile Companion (React Native / Expo)  
> **Standard:** Pixel-Perfect, WCAG AAA/AA Compliant, Mobile-First, Dual-Language (English & Bengali)

---

## 1. Brand Philosophy & Identity

**omniHeaven** represents the pinnacle of living and hospitality management. The visual language evokes the tranquility, warmth, and prestige of 5-star heritage resorts (Aman, Four Seasons) blended with the surgical operational clarity of high-end Swiss enterprise software.

### Core Visual Tenets
1. **Warmth Over Sterility:** We replace cold generic blues and harsh grayscale grays with rich alabaster creams, ivory surfaces, warm roasted espresso text, and cognac tones.
2. **Radiant Champagne Gold:** Gold is used purposefully as an accent of prestige, high priority, and refinement — never gaudy, always balanced by earthy browns and ivory canvases.
3. **Seamless Light & Dark Polarity:**
   - **Light Mode (The Day Pavilion):** Alabaster cream canvas with soft ivory porcelain cards and deep espresso typography.
   - **Dark Mode (The Night Sanctuary):** Deep obsidian espresso canvas with warm dark bronze cards and luminous champagne gold typography and hairlines.
4. **Cinematic Micro-Interactions:** Subtle, silky cubic-bezier transitions (`[0.16, 1, 0.3, 1]`), interactive card micro-lifts, and soft ambient gold halos.

---

## 2. Color System & Semantic Tokens

### 2.1 The Royal Heritage & Champagne Palette

```
                           LIGHT THEME (Day Pavilion)
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Canvas: Alabaster Cream      │ #FDFBF7 │ hsl(40, 50%, 98%)             │
 │ Surface / Card: Ivory        │ #FAF6F0 │ hsl(38, 40%, 96%)             │
 │ Surface Elevated: Pure White │ #FFFFFF │ hsl(0, 0%, 100%)              │
 │ Surface Translucent Glass    │ rgba(250, 246, 240, 0.82)               │
 │ Border / Hairline: Soft Taupe│ #EADBCE │ hsl(32, 35%, 89%)             │
 │ Border Gold: Champagne      │ #D8C29D │ hsl(37, 45%, 73%)             │
 │ Text Primary: Roasted Coffee │ #2A201C │ hsl(18, 20%, 14%)             │
 │ Text Muted: Warm Earth       │ #735E54 │ hsl(19, 15%, 39%)             │
 └────────────────────────────────────────────────────────────────────────┘

                           DARK THEME (Night Sanctuary)
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Canvas: Obsidian Espresso    │ #14110F │ hsl(24, 14%, 7%)              │
 │ Surface / Card: Dark Bronze  │ #1E1815 │ hsl(22, 17%, 10%)             │
 │ Surface Elevated: Warm Noir  │ #27201C │ hsl(23, 16%, 13%)             │
 │ Surface Translucent Glass    │ rgba(30, 24, 21, 0.85)                  │
 │ Border / Hairline: Deep Soil │ #382D26 │ hsl(23, 19%, 18%)             │
 │ Border Gold: Luminous Bronze │ #6E583B │ hsl(34, 30%, 33%)             │
 │ Text Primary: Soft Ivory     │ #FBF8F3 │ hsl(40, 45%, 97%)             │
 │ Text Muted: Warm Sand        │ #A8988F │ hsl(22, 12%, 61%)             │
 └────────────────────────────────────────────────────────────────────────┘

                           SHARED ACCENTS & GRADIENTS
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Gold Primary: Radiant Champ. │ #C5A880 │ hsl(35, 41%, 64%)             │
 │ Gold Shimmer / High-Sheen    │ #E5C378 │ hsl(41, 71%, 68%)             │
 │ Gold Deep / Antique Brass    │ #9E7D47 │ hsl(37, 38%, 45%)             │
 │ Cognac / Royal Brown         │ #4A3728 │ hsl(26, 30%, 22%)             │
 │ Success Emerald              │ #1E824C │ hsl(147, 62%, 31%)            │
 │ Warning Amber                │ #D97706 │ hsl(38, 92%, 44%)             │
 │ Destructive / Crimson        │ #C0392B │ hsl(6, 63%, 46%)              │
 └────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Gold Gradients & Metallic Accents
- **Gold CTA Gradient:** `linear-gradient(135deg, #DFBA73 0%, #C5A880 50%, #9E7D47 100%)`
- **Gold Shimmer Sheen:** `linear-gradient(90deg, transparent 0%, rgba(229,195,120,0.25) 50%, transparent 100%)`
- **Dark Gold Surface Gradient:** `linear-gradient(180deg, rgba(197,168,128,0.12) 0%, rgba(30,24,21,0) 100%)`

---

## 3. Typography Hierarchy

### 3.1 Font Pairing
1. **Editorial Display Serif (`font-display`):** **Playfair Display**
   - Used for: Brand marks, Hero headings (`h1`), Page titles, Suite & Property names, Milestones.
   - Personality: Grand, refined, bespoke, evocative of 5-star estate architecture.
2. **Modern Geometric UI Sans (`font-sans`):** **Plus Jakarta Sans**
   - Used for: Dashboard navigation, dense financial data tables, form inputs, buttons, metrics, and body text.
   - Personality: Crisp legibility, generous x-height, native tabular numbers (`font-variant-numeric: tabular-nums`).
3. **Bengali Script Support (`font-bangla`):** **Hind Siliguri**
   - Used for: Bengali localization (`bn-BD`), NID fields, local lease terms.

### 3.2 Type Scale
| Role | Font Family | Size | Weight | Line Height | Tracking |
|---|---|---|---|---|---|
| **Display Hero** | Playfair Display | 44px / 2.75rem | 700 Bold | 1.15 | -0.02em |
| **Heading 1** | Playfair Display | 32px / 2.00rem | 600 SemiBold | 1.25 | -0.015em |
| **Heading 2** | Playfair Display | 24px / 1.50rem | 600 SemiBold | 1.30 | -0.01em |
| **Heading 3** | Plus Jakarta Sans | 18px / 1.125rem | 600 SemiBold | 1.40 | -0.005em |
| **Body Large** | Plus Jakarta Sans | 16px / 1.00rem | 400 Regular | 1.55 | 0 |
| **Body Default** | Plus Jakarta Sans | 14px / 0.875rem | 400 Regular | 1.50 | 0 |
| **Caption / Label** | Plus Jakarta Sans | 12px / 0.75rem | 500 Medium | 1.40 | +0.02em |
| **Financial / Metric** | Plus Jakarta Sans | 20px - 36px | 700 Bold (Tabular) | 1.20 | -0.01em |

---

## 4. Surfaces, Glassmorphism & Elevation

### 4.1 Frosted Warm Glass (`.luxury-glass`)
Translucent cards let background ambient gradients peek through softly:
```css
.luxury-glass {
  background: rgba(250, 246, 240, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(216, 194, 157, 0.45);
  box-shadow: 0 10px 30px -10px rgba(42, 32, 28, 0.05),
              0 1px 3px rgba(42, 32, 28, 0.03);
}

.dark .luxury-glass {
  background: rgba(30, 24, 21, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(110, 88, 59, 0.35);
  box-shadow: 0 12px 36px -10px rgba(0, 0, 0, 0.45),
              0 1px 3px rgba(0, 0, 0, 0.2);
}
```

### 4.2 Elevation Levels
- **Level 0 (Flat):** No shadow; 1px soft hairline border.
- **Level 1 (Card Rest):** `shadow-[0_4px_20px_-4px_rgba(42,32,28,0.04)]` (Light) / `shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]` (Dark).
- **Level 2 (Hover / Active Card):** `shadow-[0_12px_32px_-6px_rgba(42,32,28,0.08)]` with `-2px` transform lift.
- **Level 3 (Modal / Floating Drawer):** `shadow-[0_24px_60px_-12px_rgba(42,32,28,0.18)]` with warm champagne edge highlight.

---

## 5. Silky Luxury Motion Suite

All animations use custom non-spring cubic-bezier easing to ensure a calm, deliberate, and high-end feel:

```typescript
export const luxuryEase = [0.16, 1, 0.3, 1] as const;

export const motionVariants = {
  fadeInUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: luxuryEase } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: luxuryEase } },
  },
  cardHover: {
    rest: { y: 0, transition: { duration: 0.25, ease: luxuryEase } },
    hover: { y: -2, transition: { duration: 0.25, ease: luxuryEase } },
  },
  scalePress: {
    tap: { scale: 0.98, transition: { duration: 0.1 } },
  },
  staggerChildren: {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  },
};
```

---

## 6. Shared Component Architecture

Every component in `@omniheaven/ui` carries the signature styling:

1. **Button (`Button`)**:
   - `variant="luxury"`: Radiant champagne gold gradient, dark roasted espresso typography, subtle hover halo glow.
   - `variant="outline"`: Warm ivory surface, 1px champagne gold border, espresso text.
   - `variant="cognac"`: Deep roasted brown fill with soft ivory text for secondary administrative actions.
   - `variant="ghost"`: Zero border, champagne hover background.
2. **Card (`Card`)**:
   - `variant="default"`: Warm ivory porcelain background with taupe hairline.
   - `variant="glass"`: Translucent frosted glass with backdrop blur and gold hairline.
   - `variant="gold"`: Subtle gold top border accent line (`border-t-2 border-t-[#C5A880]`).
3. **Badge (`Badge` & `StatusBadge`)**:
   - Pill-shaped (`rounded-full`), uppercase micro-tracking (`tracking-wider text-[11px]`).
   - Tone variants: `gold`, `cognac`, `success` (soft sage green), `warning` (soft amber), `destructive` (soft ruby).
4. **Input (`Input`)**:
   - Light mode: Alabaster fill (`#FDFBF7`), subtle champagne border (`#EADBCE`), focus ring in glowing gold (`#C5A880`).
   - Dark mode: Obsidian bronze fill (`#1E1815`), dark bronze border (`#382D26`), focus ring in luminous gold (`#D4AF37`).
5. **Tabs (`Tabs` & `AnimatedTabIndicator`)**:
   - Sliding gold-tinted pill indicator moving smoothly beneath the active tab with Framer Motion `layoutId`.

---

## 7. Multi-Platform Delivery: Web & Mobile (Expo)

### Web (Tailwind v4 `@theme`)
Imported into all Next.js applications via:
```css
@import "@omniheaven/ui/styles.css";
```

### Mobile (React Native / Expo)
Imported into React Native screens and components via:
```typescript
import { tokens } from "@omniheaven/ui";
// Use tokens.colors.light.goldPrimary, tokens.typography.heading1, etc.
```
