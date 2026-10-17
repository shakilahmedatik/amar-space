/**
 * @omniheaven/ui - Master Design Tokens
 * Single cross-platform source of truth for Web (Tailwind v4) and Mobile (React Native / Expo).
 */

export const colors = {
  light: {
    canvas: "#FDFBF7", // Soft Alabaster Cream
    surface: "#FAF6F0", // Warm Ivory Porcelain Card
    surfaceElevated: "#FFFFFF",
    surfaceGlass: "rgba(250, 246, 240, 0.82)",
    border: "#EADBCE", // Soft Champagne/Taupe Hairline
    borderGold: "#D8C29D", // Radiant Champagne Border
    borderGoldSubtle: "rgba(216, 194, 157, 0.45)",
    textPrimary: "#2A201C", // Deep Roasted Espresso
    textSecondary: "#5C4B43", // Warm Earth
    textMuted: "#735E54", // Taupe Muted
    goldPrimary: "#C5A880", // Champagne Gold Primary
    goldSecondary: "#E5C378", // Luminous High-Sheen Gold
    goldDark: "#9E7D47", // Antique Brass
    goldGlow: "rgba(197, 168, 128, 0.35)",
    cognac: "#4A3728", // Royal Cognac Brown
    cognacDark: "#332418",
    success: "#1E824C",
    successBg: "#EAF7F0",
    successBorder: "#B7E4C7",
    warning: "#D97706",
    warningBg: "#FEF3C7",
    warningBorder: "#FDE68A",
    error: "#C0392B",
    errorBg: "#FDF0ED",
    errorBorder: "#F8D7DA",
    info: "#2980B9",
    infoBg: "#EBF5FB",
    infoBorder: "#D4E6F1",
  },
  dark: {
    canvas: "#14110F", // Deep Obsidian Espresso
    surface: "#1E1815", // Warm Dark Bronze Card
    surfaceElevated: "#27201C",
    surfaceGlass: "rgba(30, 24, 21, 0.85)",
    border: "#382D26", // Deep Soil Hairline
    borderGold: "#6E583B", // Muted Bronze Border
    borderGoldSubtle: "rgba(110, 88, 59, 0.35)",
    textPrimary: "#FBF8F3", // Soft Warm Ivory
    textSecondary: "#D6CCC2", // Warm Pale Sand
    textMuted: "#A8988F", // Taupe Sand Muted
    goldPrimary: "#D4AF37", // Luminous Gold Primary
    goldSecondary: "#E5C378", // Shimmer Accent
    goldDark: "#A38350",
    goldGlow: "rgba(212, 175, 55, 0.35)",
    cognac: "#2D211A", // Dark Cognac Shadow
    cognacDark: "#201610",
    success: "#2ECC71",
    successBg: "#0E2919",
    successBorder: "#1B4D2E",
    warning: "#F59E0B",
    warningBg: "#2E1F08",
    warningBorder: "#5C3E0E",
    error: "#E74C3C",
    errorBg: "#2E1110",
    errorBorder: "#5C201E",
    info: "#3498DB",
    infoBg: "#0E2433",
    infoBorder: "#1A4968",
  },
} as const;

export const gradients = {
  goldButton: "linear-gradient(135deg, #DFBA73 0%, #C5A880 50%, #9E7D47 100%)",
  goldButtonDark: "linear-gradient(135deg, #E5C378 0%, #D4AF37 50%, #A38350 100%)",
  goldShimmer:
    "linear-gradient(90deg, transparent 0%, rgba(229, 195, 120, 0.25) 50%, transparent 100%)",
  goldHaloLight: "radial-gradient(circle, rgba(197, 168, 128, 0.15) 0%, transparent 70%)",
  goldHaloDark: "radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, transparent 70%)",
  cardGlassLight:
    "linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 246, 240, 0.8) 100%)",
  cardGlassDark: "linear-gradient(180deg, rgba(39, 32, 28, 0.9) 0%, rgba(30, 24, 21, 0.8) 100%)",
} as const;

export const typography = {
  fontFamilies: {
    display: "'Playfair Display', Georgia, serif",
    sans: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    bangla: "'Hind Siliguri', sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 38,
    "5xl": 48,
  },
  lineHeights: {
    tight: 1.15,
    snug: 1.25,
    normal: 1.4,
    relaxed: 1.55,
    loose: 1.7,
  },
  fontWeights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  letterSpacings: {
    tighter: -0.8,
    tight: -0.4,
    normal: 0,
    wide: 0.5,
    wider: 1.2,
  },
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radii = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  full: 9999,
} as const;

export const shadows = {
  light: {
    subtle: "0 2px 8px -2px rgba(42, 32, 28, 0.04)",
    card: "0 6px 20px -4px rgba(42, 32, 28, 0.05), 0 1px 3px rgba(42, 32, 28, 0.02)",
    hover: "0 14px 34px -8px rgba(42, 32, 28, 0.09), 0 2px 6px rgba(42, 32, 28, 0.03)",
    modal: "0 24px 60px -12px rgba(42, 32, 28, 0.18)",
    goldGlow: "0 0 20px rgba(197, 168, 128, 0.35)",
  },
  dark: {
    subtle: "0 2px 8px -2px rgba(0, 0, 0, 0.3)",
    card: "0 8px 24px -4px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.2)",
    hover: "0 16px 40px -8px rgba(0, 0, 0, 0.65), 0 2px 6px rgba(0, 0, 0, 0.3)",
    modal: "0 28px 70px -12px rgba(0, 0, 0, 0.85)",
    goldGlow: "0 0 24px rgba(212, 175, 55, 0.35)",
  },
} as const;

export const motion = {
  luxuryEase: [0.16, 1, 0.3, 1] as const,
  durationFast: 0.15,
  durationNormal: 0.25,
  durationSlow: 0.4,
} as const;

export const tokens = {
  colors,
  gradients,
  typography,
  spacing,
  radii,
  shadows,
  motion,
} as const;

export type ThemeMode = "light" | "dark";
export type DesignTokens = typeof tokens;
