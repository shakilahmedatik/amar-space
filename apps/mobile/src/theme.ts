/**
 * omniHeaven Mobile App - Design System Theme
 * Powered by @omniheaven/ui tokens
 */

import { type ThemeMode, tokens } from "@omniheaven/ui";

export function getMobileTheme(mode: ThemeMode = "dark") {
  const c = tokens.colors[mode];
  const isDark = mode === "dark";

  return {
    mode,
    isDark,
    colors: {
      canvas: c.canvas,
      surface: c.surface,
      surfaceElevated: c.surfaceElevated,
      surfaceGlass: c.surfaceGlass,
      border: c.border,
      borderGold: c.borderGold,
      textPrimary: c.textPrimary,
      textSecondary: c.textSecondary,
      textMuted: c.textMuted,
      goldPrimary: c.goldPrimary,
      goldSecondary: c.goldSecondary,
      goldDark: c.goldDark,
      goldGlow: c.goldGlow,
      cognac: c.cognac,
      success: c.success,
      warning: c.warning,
      error: c.error,
    },
    typography: {
      display: {
        fontFamily: isDark ? "serif" : "Georgia",
        fontSize: 22,
        fontWeight: "bold" as const,
        color: c.textPrimary,
      },
      heading: {
        fontSize: 18,
        fontWeight: "600" as const,
        color: c.textPrimary,
      },
      subheading: {
        fontSize: 14,
        fontWeight: "500" as const,
        color: c.textSecondary,
      },
      body: {
        fontSize: 14,
        color: c.textPrimary,
      },
      caption: {
        fontSize: 11,
        color: c.textMuted,
        textTransform: "uppercase" as const,
        letterSpacing: 1,
      },
      financialMetric: {
        fontSize: 24,
        fontWeight: "bold" as const,
        color: c.goldPrimary,
      },
    },
    card: {
      backgroundColor: c.surface,
      borderColor: isDark ? c.border : c.borderGold,
      borderWidth: 1,
      borderRadius: tokens.radii.xl,
      padding: tokens.spacing[4],
      shadowColor: isDark ? "#000" : "#2A201C",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.4 : 0.06,
      shadowRadius: 12,
    },
    buttonLuxury: {
      backgroundColor: c.goldPrimary,
      borderRadius: tokens.radii.lg,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: c.goldPrimary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
    },
  };
}

export type MobileTheme = ReturnType<typeof getMobileTheme>;
