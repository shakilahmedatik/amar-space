# omniHeaven Design System Governance Rule

Whenever you are asked to create, edit, debug, or restyle any frontend component, page, or layout (including Next.js web apps and React Native mobile screens):

1. **Mandatory Skill Activation:** Consult and strictly adhere to `.agents/skills/omniheaven-design-system/SKILL.md`.
2. **Centralized UI Imports:** You must import all UI primitives (`Button`, `Card`, `Badge`, `StatusBadge`, `Input`, `Table`, `LuxuryTabs`, `motion`) exclusively from `@omniheaven/ui`. Do not create ad-hoc buttons, cards, or status tags inside application folders.
3. **Palette Invariant:** Strictly use the **Royal Heritage & Champagne** palette:
   - Light Mode: Soft Alabaster Cream canvas (`#FDFBF7`), Warm Ivory surfaces (`#FAF6F0`), and Deep Roasted Espresso text (`#2A201C`).
   - Dark Mode: Deep Obsidian Espresso canvas (`#14110F`), Dark Bronze surfaces (`#1E1815`), and Soft Warm Ivory text (`#FBF8F3`).
   - Accents: Radiant Champagne Gold (`#C5A880` / `#D4AF37`) and Cognac (`#4A3728`).
   - Never write arbitrary inline hex codes or generic Tailwind colors (`bg-blue-600`, `text-slate-900`, `bg-indigo-500`).
4. **Typography Rule:**
   - Headings & Titles: `font-display` (`Playfair Display`, serif).
   - Body & Financial Metrics: `font-sans` (`Plus Jakarta Sans`) with `tabular-nums`.
   - Bengali Text: `font-bangla` (`Hind Siliguri`).
5. **Quality Verification:** Every UI change must pass `bun run check` (Biome) and `bun run check-types` (Turbo) with 0 errors.
