---
version: alpha
name: AmarSpace-design-system
description: AmarSpace is a Bangladeshi property management platform designed for property owners and managers. The design system prioritizes Bangla-first UX, mobile-first usability, elderly-friendly interfaces, and operational clarity. It adapts the MiniMax-inspired visual language — DM Sans typography, pill-shaped CTAs, flat card surfaces — into a property management context with warm, trustworthy tones and accessible touch targets. Coverage spans the tenant dashboard, property management views, payment tracking, audit logs, and authentication surfaces.

colors:
  primary: "#0a0a0a"
  on-primary: "#ffffff"
  primary-soft: "#181e25"
  brand-green: "#1ba673"
  brand-green-light: "#e8ffea"
  brand-blue: "#1456f0"
  brand-blue-mid: "#3b82f6"
  brand-blue-deep: "#1d4ed8"
  brand-blue-200: "#bfdbfe"
  brand-orange: "#f97316"
  brand-orange-light: "#fff7ed"
  canvas: "#ffffff"
  surface: "#f7f8fa"
  surface-soft: "#f2f3f5"
  hairline: "#e5e7eb"
  hairline-soft: "#eaecf0"
  ink: "#0a0a0a"
  ink-strong: "#000000"
  charcoal: "#222222"
  slate: "#45515e"
  steel: "#5f5f5f"
  stone: "#8e8e93"
  muted: "#a8aab2"
  success-bg: "#e8ffea"
  success-text: "#1ba673"
  warning-bg: "#fff7ed"
  warning-text: "#c2410c"
  error-bg: "#fef2f2"
  error-text: "#d45656"
  on-dark: "#ffffff"
  footer-bg: "#0a0a0a"

typography:
  hero-display:
    fontFamily: DM Sans
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -1.5px
  display-lg:
    fontFamily: DM Sans
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: -1px
  heading-lg:
    fontFamily: DM Sans
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.5px
  heading-md:
    fontFamily: DM Sans
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.30
    letterSpacing: -0.25px
  heading-sm:
    fontFamily: DM Sans
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.35
  card-title:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.40
  subtitle:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.50
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.60
  body-md-bold:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.60
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  body-sm-medium:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.55
  caption:
    fontFamily: DM Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.70
  caption-bold:
    fontFamily: DM Sans
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.50
  micro:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.50
  button-md:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.40
  button-lg:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.40

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 20px
  xxxl: 24px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  section-sm: 48px
  section: 64px
  section-lg: 80px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
    minHeight: 44px
  button-primary-pressed:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.on-primary}"
  button-primary-disabled:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.muted}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
    border: "1px solid {colors.ink}"
    minHeight: 44px
  button-tertiary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
    border: "1px solid {colors.hairline}"
    minHeight: 44px
  button-success:
    backgroundColor: "{colors.brand-green}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
    minHeight: 44px
  button-danger:
    backgroundColor: "{colors.error-text}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
    minHeight: 44px
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.brand-blue-deep}"
    typography: "{typography.body-sm-medium}"
    padding: "8px 0"
  button-icon-circular:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 44px
    border: "1px solid {colors.hairline}"
  card-base:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  card-property:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  card-stat:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  card-tenant:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.hairline}"
  card-payment:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.hairline}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    border: "1px solid {colors.hairline}"
    minHeight: 44px
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    border: "2px solid {colors.brand-blue-deep}"
  text-input-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.error-text}"
  select-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    border: "1px solid {colors.hairline}"
    minHeight: 44px
  badge-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-text}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning-text}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error-text}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-info:
    backgroundColor: "{colors.brand-blue-200}"
    textColor: "{colors.brand-blue-deep}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-neutral:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.steel}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  data-table:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.hairline}"
  data-table-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.steel}"
    typography: "{typography.caption-bold}"
    padding: "{spacing.sm} {spacing.md}"
  data-table-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    padding: "{spacing.md}"
    minHeight: 48px
    border: "0 0 1px {colors.hairline-soft} solid"
  sidebar-nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    minHeight: 44px
  sidebar-nav-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm-medium}"
  top-nav:
    backgroundColor: "{colors.canvas}"
    height: 64px
    border: "0 0 1px {colors.hairline-soft} solid"
  mobile-bottom-nav:
    backgroundColor: "{colors.canvas}"
    height: 64px
    border: "1px 0 0 {colors.hairline-soft} solid"
  mobile-bottom-nav-item:
    textColor: "{colors.stone}"
    typography: "{typography.micro}"
    minHeight: 44px
  mobile-bottom-nav-item-active:
    textColor: "{colors.brand-green}"
    typography: "{typography.micro}"
  toast-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md} {spacing.lg}"
  toast-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md} {spacing.lg}"
  empty-state:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.steel}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xxxl}"
  footer-region:
    backgroundColor: "{colors.footer-bg}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body-sm}"
    padding: "{spacing.section-sm} {spacing.xl}"
---

## Overview

AmarSpace is a property management platform built for Bangladeshi property owners and managers. The design system serves a fundamentally operational product — tenants pay rent, owners track properties, managers handle maintenance — so every surface prioritizes clarity, speed, and accessibility over visual spectacle.

The visual language inherits a modern SaaS sensibility: DM Sans as the sole typeface, pill-shaped primary CTAs in near-black, flat white cards with hairline borders, and a restrained color palette where green signals success/money, blue signals information/links, and orange signals warnings/attention. The system is mobile-first by default — most users will interact via phone — and elderly-friendly, meaning generous touch targets (44px minimum), high contrast text, and clear visual hierarchy without relying on subtle color differences.

**Key Characteristics:**
- Mobile-first, touch-optimized (44px minimum interactive targets)
- Bangla-first UX — all labels, messages, and flows designed for Bangla speakers
- Elderly-friendly — high contrast, large text, clear affordances, no hidden gestures
- Operational clarity — dashboards, tables, and forms over marketing flourishes
- Flat design with hairline borders; elevation reserved for modals and toasts
- DM Sans across all surfaces; no secondary typeface
- Pill-shaped primary buttons ({rounded.full}); rounded cards ({rounded.lg}–{rounded.xl})
- Green ({colors.brand-green}) as the primary accent for financial/success states
- Black ({colors.primary}) pill CTAs for primary actions

## Colors

### Primary & Neutral
- **Primary** ({colors.primary}): Near-black used for primary CTAs and strong text. The dominant interactive color.
- **On-Primary** ({colors.on-primary}): White text on primary backgrounds.
- **Canvas** ({colors.canvas}): White page background and card surfaces.
- **Surface** ({colors.surface}): Subtle gray for section backgrounds, stat cards, and inactive states.
- **Surface Soft** ({colors.surface-soft}): Quieter section divisions.
- **Hairline** ({colors.hairline}): Primary border and divider color (1px).
- **Hairline Soft** ({colors.hairline-soft}): Lighter divider for table rows.

### Text Hierarchy
- **Ink** ({colors.ink}): Primary text — headings, labels, strong content.
- **Charcoal** ({colors.charcoal}): Body text on light surfaces.
- **Slate** ({colors.slate}): Secondary text, metadata, timestamps.
- **Steel** ({colors.steel}): Tertiary text, table headers, placeholder text.
- **Stone** ({colors.stone}): Muted captions, inactive nav items.
- **Muted** ({colors.muted}): Footer text, de-emphasized labels.

### Semantic
- **Brand Green** ({colors.brand-green}): Success states, payment confirmations, active status, financial positive indicators.
- **Brand Green Light** ({colors.brand-green-light}): Success badge backgrounds, confirmation surfaces.
- **Brand Blue** ({colors.brand-blue}): Links, informational badges, active navigation accents.
- **Brand Blue Deep** ({colors.brand-blue-deep}): Focus rings, link emphasis.
- **Brand Orange** ({colors.brand-orange}): Warnings, pending states, attention-required indicators.
- **Brand Orange Light** ({colors.brand-orange-light}): Warning badge backgrounds.
- **Error Text** ({colors.error-text}): Error messages, destructive action indicators.
- **Error Background** ({colors.error-bg}): Error badge and toast backgrounds.

### Usage Rules
- Green is the "money color" — use for payment success, active tenants, positive balances.
- Orange signals "needs attention" — overdue payments, pending approvals, maintenance requests.
- Red is reserved for errors and destructive actions only — never for general emphasis.
- Blue is informational and navigational — links, info badges, focus states.
- Black pill CTAs are the primary action; never use brand colors on standard buttons.

## Typography

### Font Family
**DM Sans** (primary): Geometric variable sans-serif. Used across every surface. Fallbacks: Inter, Helvetica Neue, Arial, sans-serif.

DM Sans provides excellent readability at small sizes (critical for mobile-first property data) while maintaining personality at display sizes. The slightly humanist counters help with Bangla-adjacent Latin characters and numerals that appear alongside Bangla text.

For Bangla text, the system uses **Noto Sans Bengali** as the Bangla-specific font, loaded alongside DM Sans. Bangla text inherits the same size/weight tokens but uses Noto Sans Bengali for rendering.

### Hierarchy

| Token | Size | Weight | Line Height | Use |
|---|---|---|---|---|
| `{typography.hero-display}` | 48px | 600 | 1.15 | Dashboard welcome, major page titles |
| `{typography.display-lg}` | 36px | 600 | 1.20 | Section headers on marketing/landing |
| `{typography.heading-lg}` | 28px | 600 | 1.25 | Page titles ("Properties", "Tenants") |
| `{typography.heading-md}` | 24px | 600 | 1.30 | Card section headers |
| `{typography.heading-sm}` | 20px | 600 | 1.35 | Card titles, modal headers |
| `{typography.card-title}` | 18px | 600 | 1.40 | Stat card labels, list item titles |
| `{typography.subtitle}` | 16px | 500 | 1.50 | Section subtitles, form group labels |
| `{typography.body-md}` | 16px | 400 | 1.60 | Primary body text, form inputs |
| `{typography.body-sm}` | 14px | 400 | 1.55 | Secondary text, table cells, nav items |
| `{typography.caption}` | 13px | 400 | 1.70 | Timestamps, helper text, fine print |
| `{typography.micro}` | 12px | 400 | 1.50 | Bottom nav labels, chip text |
| `{typography.button-md}` | 14px | 600 | 1.40 | Standard button labels |
| `{typography.button-lg}` | 16px | 600 | 1.40 | Large/primary button labels |

### Principles
- **Generous line-height** (1.55–1.70) across body and caption sizes for readability on small screens.
- **16px minimum** for primary body text — never go below 14px for any readable content.
- **Weight discipline:** 400 (body), 500 (medium emphasis), 600 (headings/buttons), 700 (inline strong emphasis).
- **Single typeface** for Latin; Noto Sans Bengali for Bangla script. No decorative or display fonts.
- **No italic** — emphasis through weight only, which works better for Bangla-mixed content.

## Layout

### Spacing System
- **Base unit**: 4px (8px primary increment).
- **Tokens**: `{spacing.xxs}` (4px) · `{spacing.xs}` (8px) · `{spacing.sm}` (12px) · `{spacing.md}` (16px) · `{spacing.lg}` (20px) · `{spacing.xl}` (24px) · `{spacing.xxl}` (32px) · `{spacing.xxxl}` (40px) · `{spacing.section-sm}` (48px) · `{spacing.section}` (64px) · `{spacing.section-lg}` (80px).
- **Page padding**: 16px on mobile, 24px on tablet, 32px on desktop.
- **Card internal padding**: `{spacing.lg}` (20px) on mobile, `{spacing.xl}` (24px) on desktop.
- **Section gaps**: `{spacing.xxl}` (32px) between major sections on mobile, `{spacing.section-sm}` (48px) on desktop.

### Grid & Container
- **Mobile**: Single column, full-width cards with 16px horizontal padding.
- **Tablet** (768px+): 2-column grid for property/tenant cards, 720px max content width.
- **Desktop** (1024px+): Sidebar (240px fixed) + main content area. Main content max-width 960px.
- **Wide Desktop** (1280px+): Sidebar + main content (max 1080px) with generous margins.

### Navigation Structure
- **Mobile**: Bottom tab navigation (5 items max) + hamburger for secondary nav.
- **Tablet/Desktop**: Left sidebar navigation with collapsible sections.
- **Top bar**: Always visible — logo left, notifications + profile right.

### Content Density
- **Dashboard**: Stat cards in 2×2 grid (mobile) or 4-column row (desktop), followed by recent activity list.
- **List views**: Full-width cards on mobile, table layout on desktop (768px+).
- **Forms**: Single-column on mobile, 2-column on desktop for related field pairs.
- **Detail views**: Single-column with stacked sections, each in its own card.

## Elevation & Depth

The system is predominantly flat. Elevation is used sparingly for overlays and feedback.

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | No shadow; `{colors.hairline}` border | Default cards, table rows, form inputs |
| 1 (subtle) | `rgba(0, 0, 0, 0.04) 0px 1px 3px 0px` | Stat cards, slightly raised surfaces |
| 2 (dropdown) | `rgba(0, 0, 0, 0.08) 0px 4px 8px 0px` | Dropdowns, popovers, select menus |
| 3 (modal) | `rgba(0, 0, 0, 0.12) 0px 8px 24px 0px` | Modals, bottom sheets, confirmation dialogs |
| 4 (toast) | `rgba(0, 0, 0, 0.16) 0px 12px 32px -4px` | Toast notifications, floating action buttons |

### Principles
- Cards use borders, not shadows, as their default boundary.
- Shadows appear only when content overlays other content (modals, dropdowns, toasts).
- Bottom sheets on mobile use level 3 shadow with a subtle top border.
- No decorative shadows on static content.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Inline code, micro-chips |
| `{rounded.sm}` | 6px | Small tags, compact controls |
| `{rounded.md}` | 8px | Form inputs, select dropdowns |
| `{rounded.lg}` | 12px | Cards, modals, bottom sheets |
| `{rounded.xl}` | 16px | Feature cards, large panels |
| `{rounded.xxl}` | 20px | Hero cards, promotional surfaces |
| `{rounded.xxxl}` | 24px | Full-page modals on mobile |
| `{rounded.full}` | 9999px | Buttons, badges, avatars, pills |

### Principles
- All buttons use `{rounded.full}` — the pill shape is a system signature.
- Cards use `{rounded.lg}` (12px) as the default; larger feature cards use `{rounded.xl}` (16px).
- Form inputs use `{rounded.md}` (8px) — distinct from cards but not pill-shaped.
- Avatars are always `{rounded.full}` (perfect circles).

## Components

### Buttons

**`button-primary`** — Black pill primary CTA. The dominant action on every surface.
- Background `{colors.primary}`, text `{colors.on-primary}`, typography `{typography.button-md}`, padding `12px 24px`, rounded `{rounded.full}`, minHeight 44px.
- Pressed: background shifts to `{colors.charcoal}`.
- Disabled: background `{colors.hairline}`, text `{colors.muted}`.

**`button-secondary`** — Outlined pill for secondary actions.
- Background transparent, text `{colors.ink}`, border `1px solid {colors.ink}`, rounded `{rounded.full}`, minHeight 44px.

**`button-tertiary`** — White-fill quiet pill for tertiary/cancel actions.
- Background `{colors.canvas}`, text `{colors.ink}`, border `1px solid {colors.hairline}`, rounded `{rounded.full}`, minHeight 44px.

**`button-success`** — Green pill for financial confirmations (approve payment, confirm deposit).
- Background `{colors.brand-green}`, text `{colors.on-dark}`, rounded `{rounded.full}`, minHeight 44px.

**`button-danger`** — Red pill for destructive actions (remove tenant, delete property).
- Background `{colors.error-text}`, text `{colors.on-dark}`, rounded `{rounded.full}`, minHeight 44px.

**`button-link`** — Inline text link styled as a subtle button.
- Background transparent, text `{colors.brand-blue-deep}`, typography `{typography.body-sm-medium}`.

**`button-icon-circular`** — 44×44px circular utility button (notifications, settings, close).
- Background `{colors.canvas}`, text `{colors.ink}`, border `1px solid {colors.hairline}`, rounded `{rounded.full}`.

### Cards

**`card-base`** — Standard content card used across the platform.
- Background `{colors.canvas}`, rounded `{rounded.xl}`, padding `{spacing.xl}`, border `1px solid {colors.hairline}`.

**`card-property`** — Property listing card showing address, unit count, occupancy.
- Same chrome as `card-base`. Top section: property name in `{typography.card-title}`, address in `{typography.body-sm}` `{colors.slate}`. Bottom: stat row with unit count, occupancy rate, monthly revenue.

**`card-stat`** — Dashboard metric card (Total Properties, Active Tenants, Monthly Revenue, Pending Payments).
- Background `{colors.surface}`, rounded `{rounded.lg}`, padding `{spacing.lg}`. Large number in `{typography.heading-md}` `{colors.ink}`, label below in `{typography.caption}` `{colors.steel}`.

**`card-tenant`** — Tenant summary card showing name, flat, payment status.
- Background `{colors.canvas}`, rounded `{rounded.lg}`, padding `{spacing.lg}`, border `1px solid {colors.hairline}`. Avatar circle left, name + flat in center, payment badge right.

**`card-payment`** — Payment record card showing amount, date, status.
- Background `{colors.canvas}`, rounded `{rounded.lg}`, padding `{spacing.lg}`, border `1px solid {colors.hairline}`. Amount in `{typography.card-title}`, date in `{typography.caption}`, status badge right-aligned.

### Inputs & Forms

**`text-input`** — Standard text field (name, phone, NID, amounts).
- Background `{colors.canvas}`, text `{colors.ink}`, border `1px solid {colors.hairline}`, rounded `{rounded.md}`, minHeight 44px.
- Label above in `{typography.body-sm-medium}` `{colors.charcoal}`.
- Placeholder in `{colors.stone}`.

**`text-input-focused`** — Active input state.
- Border switches to `2px solid {colors.brand-blue-deep}`.

**`text-input-error`** — Validation error state.
- Background `{colors.error-bg}`, border `1px solid {colors.error-text}`. Error message below in `{typography.caption}` `{colors.error-text}`.

**`select-input`** — Dropdown select (blood group, occupation, flat selection).
- Same chrome as `text-input` with chevron icon right-aligned.

### Form Patterns
- Labels always above inputs, never floating or inline.
- Required fields marked with a red asterisk after the label.
- Error messages appear immediately below the input, not in a toast.
- Form groups separated by `{spacing.xl}` (24px).
- Submit buttons full-width on mobile, right-aligned on desktop.
- Multi-step forms use a progress indicator at the top.

### Badges & Status

**`badge-success`** — Active tenant, paid status, approved.
- Background `{colors.success-bg}`, text `{colors.success-text}`, rounded `{rounded.full}`, padding `4px 10px`.

**`badge-warning`** — Pending approval, overdue payment, maintenance requested.
- Background `{colors.warning-bg}`, text `{colors.warning-text}`, rounded `{rounded.full}`, padding `4px 10px`.

**`badge-error`** — Failed payment, rejected, critical issue.
- Background `{colors.error-bg}`, text `{colors.error-text}`, rounded `{rounded.full}`, padding `4px 10px`.

**`badge-info`** — Informational status, new feature indicator.
- Background `{colors.brand-blue-200}`, text `{colors.brand-blue-deep}`, rounded `{rounded.full}`, padding `4px 10px`.

**`badge-neutral`** — Inactive, archived, default state.
- Background `{colors.surface}`, text `{colors.steel}`, rounded `{rounded.full}`, padding `4px 10px`.

### Data Tables

**`data-table`** — Used for tenant lists, payment history, audit logs on desktop.
- Background `{colors.canvas}`, rounded `{rounded.lg}`, border `1px solid {colors.hairline}`.
- Rows have 48px minimum height for touch accessibility.

**`data-table-header`** — Column headers.
- Background `{colors.surface}`, text `{colors.steel}`, typography `{typography.caption-bold}`.

**`data-table-row`** — Body rows.
- Background `{colors.canvas}`, text `{colors.ink}`, typography `{typography.body-sm}`, bottom border `1px solid {colors.hairline-soft}`.
- On mobile, tables collapse to card-based list views.

### Navigation

**`top-nav`** — Persistent top bar across all authenticated views.
- Background `{colors.canvas}`, height 64px, bottom border `1px solid {colors.hairline-soft}`.
- Left: AmarSpace logo/wordmark. Right: notification bell + user avatar/menu.
- On mobile: hamburger left (for sidebar access), logo center, notifications right.

**`sidebar-nav-item`** + **`sidebar-nav-item-active`** — Desktop/tablet left rail navigation.
- Inactive: background transparent, text `{colors.charcoal}`, typography `{typography.body-sm}`, rounded `{rounded.md}`, minHeight 44px.
- Active: background `{colors.surface}`, text `{colors.ink}`, typography `{typography.body-sm-medium}`.
- Icons (20×20px) precede each label.

**`mobile-bottom-nav`** — Fixed bottom tab bar on mobile (< 768px).
- Background `{colors.canvas}`, height 64px, top border `1px solid {colors.hairline-soft}`.
- 4–5 items: Dashboard, Properties, Tenants, Payments, More.
- Each item: icon (24×24px) + label in `{typography.micro}`.
- Active item: icon and text in `{colors.brand-green}`.
- Inactive: `{colors.stone}`.

### Toasts & Feedback

**`toast-success`** — Confirmation feedback (payment recorded, tenant added).
- Background `{colors.success-bg}`, text `{colors.success-text}`, rounded `{rounded.lg}`, appears top-center on desktop, bottom-center on mobile (above bottom nav).

**`toast-error`** — Error feedback (action failed, network error).
- Background `{colors.error-bg}`, text `{colors.error-text}`, rounded `{rounded.lg}`.

### Empty States

**`empty-state`** — Shown when a list/section has no data (no tenants, no payments).
- Background `{colors.surface}`, rounded `{rounded.xl}`, padding `{spacing.xxxl}`.
- Centered illustration (simple line art, 120×120px), title in `{typography.heading-sm}`, description in `{typography.body-md}` `{colors.steel}`, optional CTA button below.

## Page Patterns

### Dashboard (Owner/Manager)
- Top: Welcome message in `{typography.heading-lg}` with user name.
- Stat cards row: Total Properties, Active Tenants, Monthly Revenue (৳), Pending Payments.
- Recent Activity list: last 5–10 actions with timestamp, actor, and action description.
- Quick Actions: "Add Property", "Add Tenant", "Record Payment" as pill buttons.

### Property List
- Mobile: Vertical card stack (`card-property`), each showing name, address, unit count.
- Desktop: Table view with columns: Name, Address, Units, Occupancy, Monthly Revenue, Actions.
- Filter bar: search input + status filter (Active/Inactive) as pill tabs.

### Tenant Detail
- Header: Avatar + name + flat assignment + status badge.
- Sections (stacked cards): Personal Info, Family Info, Emergency Contact, Rental Info, Payment History.
- Each section is a `card-base` with section title in `{typography.heading-sm}`.

### Payment Recording
- Form: Amount (৳ prefix), Date, Payment Method (select), Note (optional textarea).
- Preview card showing the payment summary before confirmation.
- Success state: green checkmark animation + toast.

### Audit Log View
- Desktop: Full data table with columns: Timestamp, Actor, Action, Entity, Details.
- Mobile: Card-based list with each entry showing action + actor + relative time.
- Filter: Date range picker + entity type filter + actor filter.
- Pagination: "Load More" button pattern on mobile, numbered pagination on desktop.

## Do's and Don'ts

### Do
- Use 44px minimum touch targets for all interactive elements on mobile.
- Use `{colors.primary}` (black pill) as the dominant CTA — it's the most recognizable action.
- Use green ({colors.brand-green}) for financial success states and payment confirmations.
- Use orange ({colors.brand-orange}) for "needs attention" states — overdue, pending, maintenance.
- Keep forms single-column on mobile with generous spacing between fields.
- Show Bangla labels and messages as the primary language; English as fallback.
- Use `{rounded.full}` on every button and badge — the pill shape is a system signature.
- Provide clear empty states with actionable CTAs when lists are empty.
- Use card-based layouts on mobile; switch to tables only on desktop (768px+).

### Don't
- Don't use font sizes below 14px for any readable content — elderly users need legibility.
- Don't rely on color alone to convey status — always pair with text labels or icons.
- Don't use hover-only interactions — mobile users can't hover.
- Don't hide critical actions behind swipe gestures — use visible buttons.
- Don't use brand-green on standard buttons — reserve it for `button-success` (financial confirmations).
- Don't apply shadows to flat cards — borders are the default boundary.
- Don't use more than 5 items in the mobile bottom navigation.
- Don't mix Bangla and English in the same label — pick one per element.
- Don't use thin (300) or light font weights — minimum 400 for body, 500 for emphasis.

## Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Single column. Bottom tab nav. Cards stack vertically. Tables become card lists. Forms full-width. |
| Tablet | 768 – 1023px | 2-column card grids. Sidebar appears (collapsible). Tables visible. Forms 2-column for paired fields. |
| Desktop | 1024 – 1279px | Fixed sidebar (240px) + main content. Full table layouts. Dashboard stat row 4-column. |
| Wide Desktop | ≥ 1280px | Wider content area (max 1080px). More breathing room. Same layout as Desktop. |

### Touch Targets
- All buttons: 44px minimum height on all breakpoints.
- Form inputs: 44px minimum height.
- Sidebar nav items: 44px minimum height.
- Bottom nav items: 44px minimum tap area.
- Table rows: 48px minimum height for tappable rows.
- Icon buttons: 44×44px minimum.

### Collapsing Strategy
- **Navigation**: Bottom tabs on mobile → left sidebar on tablet/desktop.
- **Data tables**: Table on desktop → card list on mobile.
- **Stat cards**: 4-column on desktop → 2×2 grid on mobile.
- **Forms**: 2-column paired fields on desktop → single column on mobile.
- **Modals**: Centered modal on desktop → full-screen bottom sheet on mobile.
- **Filters**: Inline filter bar on desktop → collapsible filter drawer on mobile.

### Typography Scaling
- `{typography.hero-display}` (48px) → 36px at < 768px → 28px at < 480px.
- `{typography.heading-lg}` (28px) → 24px at < 768px.
- Body sizes remain constant across breakpoints (16px body, 14px secondary).

## Accessibility

### Core Principles
- **WCAG 2.1 AA** compliance as the minimum target.
- **Color contrast**: All text meets 4.5:1 ratio against its background. Large text (24px+) meets 3:1.
- **Touch targets**: 44×44px minimum for all interactive elements.
- **Focus indicators**: 2px solid `{colors.brand-blue-deep}` outline on keyboard focus, offset 2px.
- **Screen reader support**: All interactive elements have accessible labels; images have alt text; form inputs have associated labels.
- **Motion**: Respect `prefers-reduced-motion` — disable animations when set.

### Elderly-Friendly Considerations
- Large, clearly labeled buttons with high contrast.
- No reliance on gestures (swipe, long-press) for critical actions.
- Clear visual feedback for every action (loading states, success/error toasts).
- Generous spacing between interactive elements to prevent mis-taps.
- Simple, predictable navigation patterns — no hidden menus or complex interactions.

## Bangla-First UX

### Language Strategy
- All UI labels, button text, form labels, error messages, and status indicators in Bangla by default.
- English used only for: technical identifiers (email, NID format hints), brand name "AmarSpace", and code/API references.
- Number formatting: Bengali numerals optional (user preference), but ৳ (Taka symbol) always used for currency.
- Date formatting: Bangla month names with standard DD/MM/YYYY numeric format.

### Text Direction
- LTR layout (Bangla is left-to-right).
- No RTL considerations needed.

## Iteration Guide

1. Focus on ONE component at a time. The system has high internal consistency.
2. Reference component names and tokens directly (`{colors.primary}`, `{rounded.full}`, `{typography.body-md}`) — do not paraphrase.
3. Add new variants as separate `components:` entries (`-pressed`, `-disabled`, `-active`).
4. Default to `{typography.body-md}` for body and `{typography.subtitle}` for emphasis.
5. Headlines step down: `hero-display → display-lg → heading-lg → heading-md → heading-sm → card-title`.
6. Keep semantic colors in their lanes: green = success/money, orange = warning/attention, red = error/danger, blue = info/links.
7. Every interactive element must be 44px minimum height — no exceptions.
8. Test all new components at 320px viewport width before considering them complete.

## Known Gaps

- Dark mode tokens not yet defined — the platform launches in light mode only.
- Animation/transition timings not formalized — recommend 150–200ms ease for state transitions.
- Illustration style guide not defined — use simple line-art illustrations for empty states.
- Notification/alert component patterns not yet specified beyond toasts.
- File upload component (for NID photos) not yet detailed — implement with drag-drop on desktop, camera/gallery picker on mobile.
- Print styles for receipts and reports not yet defined.
