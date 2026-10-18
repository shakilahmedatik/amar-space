---
version: alpha
name: omniHeaven-royal-heritage
description: omniHeaven is an ultra-premium hospitality and residential estate management platform. The design system embodies "Royal Heritage & Champagne" — combining the serenity, warmth, and prestige of 5-star international heritage resorts (Aman, Four Seasons) with Swiss enterprise operational precision. It features warm alabaster cream canvases, radiant champagne gold accents, roasted espresso typography, and deep cognac notes. Typography pairs editorial Playfair Display serif headings with crisp Plus Jakarta Sans geometric body and tabular numbers.
colors:
  primary: "#C5A880"
  on-primary: "#1F1714"
  primary-glow: "rgba(197, 168, 128, 0.35)"
  gold-shimmer: "#E5C378"
  gold-deep: "#9E7D47"
  gold-border: "#D8C29D"
  cognac: "#4A3728"
  cognac-dark: "#332418"
  canvas: "#FDFBF7"
  canvas-dark: "#14110F"
  surface: "#FAF6F0"
  surface-dark: "#1E1815"
  surface-elevated: "#FFFFFF"
  surface-elevated-dark: "#27201C"
  surface-glass: "rgba(250, 246, 240, 0.82)"
  surface-glass-dark: "rgba(30, 24, 21, 0.85)"
  hairline: "#EADBCE"
  hairline-dark: "#382D26"
  hairline-gold: "#D8C29D"
  hairline-gold-dark: "#6E583B"
  ink: "#2A201C"
  ink-light: "#FBF8F3"
  text-muted: "#735E54"
  text-muted-dark: "#A8988F"
  text-secondary: "#5C4B43"
  text-secondary-dark: "#D6CCC2"
  success: "#1E824C"
  success-bg: "#EAF7F0"
  success-border: "#B7E4C7"
  warning: "#D97706"
  warning-bg: "#FEF3C7"
  warning-border: "#FDE68A"
  error: "#C0392B"
  error-bg: "#FDF0ED"
  error-border: "#F8D7DA"
  info: "#2980B9"
  info-bg: "#EBF5FB"
  info-border: "#D4E6F1"

typography:
  hero-display:
    fontFamily: Playfair Display
    fontSize: 44px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -1px
  display-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: -0.5px
  heading-lg:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.25px
  heading-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.30
    letterSpacing: -0.2px
  heading-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.35
  card-title:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.40
  subtitle:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.45
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  body-md-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.55
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.50
  body-sm-medium:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.50
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.40
    letterSpacing: 1px
    textTransform: uppercase
  metric-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.20
    letterSpacing: -0.5px
  metric-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.20
    letterSpacing: -0.25px

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
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

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md-bold}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
    minHeight: 44px
    boxShadow: "0 4px 14px -2px rgba(197, 168, 128, 0.4)"
  button-secondary:
    backgroundColor: "{colors.cognac}"
    textColor: "#FFFFFF"
    typography: "{typography.body-md-bold}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
    minHeight: 44px
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-md-bold}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
    border: "1px solid {colors.gold-border}"
    minHeight: 44px
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    minHeight: 40px
  card-base:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
    boxShadow: "0 4px 20px -4px rgba(42, 32, 28, 0.04)"
  card-glass:
    backgroundColor: "{colors.surface-glass}"
    backdropFilter: "blur(12px)"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline-gold}"
    boxShadow: "0 10px 30px -10px rgba(42, 32, 28, 0.05)"
  card-stat:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.hairline}"
  badge-gold:
    backgroundColor: "rgba(197, 168, 128, 0.15)"
    textColor: "{colors.gold-deep}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    border: "1px solid {colors.gold-border}"
  badge-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    border: "1px solid {colors.success-border}"
  badge-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    border: "1px solid {colors.warning-border}"
  badge-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    border: "1px solid {colors.error-border}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "{spacing.sm} {spacing.md}"
    border: "1px solid {colors.hairline}"
    minHeight: 44px
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.primary}"
    boxShadow: "0 0 0 3px rgba(197, 168, 128, 0.25)"
