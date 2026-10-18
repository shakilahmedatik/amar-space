import type { WebsiteBuilderConfig } from "@omniheaven/validators";
import type React from "react";

interface ThemeWrapperProps {
  config: WebsiteBuilderConfig;
  children: React.ReactNode;
}

export function ThemeWrapper({ config, children }: ThemeWrapperProps) {
  const { brand, themeSlug } = config;

  // Generate dynamic CSS variables
  const customVariables = {
    "--primary-color": brand.primaryColor,
    "--accent-color": brand.accentColor,
    "--theme-font": `'${brand.fontFamily}', system-ui, sans-serif`,
    "--theme-heading-font":
      brand.fontFamily === "Playfair Display"
        ? "'Playfair Display', Georgia, serif"
        : `'${brand.fontFamily}', system-ui, sans-serif`,
  } as React.CSSProperties;

  return (
    <div
      data-theme={themeSlug}
      style={customVariables}
      className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans selection:bg-primary/20 selection:text-primary"
    >
      {/* Dynamic font stylesheet link */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </div>
  );
}
