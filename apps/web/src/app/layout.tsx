import { LanguageProvider, PlausibleTracker, ThemeProvider } from "@omniheaven/ui";
import type { Metadata } from "next";
import { Hind_Siliguri, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const hindSiliguri = Hind_Siliguri({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["bengali", "latin"],
  variable: "--font-bangla",
  display: "swap",
});

export const metadata: Metadata = {
  title: "omniHeaven | Luxury Hospitality & Property Management Platform",
  description:
    "The all-in-one platform for Hotels, Resorts, Buildings, and Flat Owners. Includes Shopify-style website builder, direct booking engine, and automated renter portals.",
  openGraph: {
    title: "omniHeaven - Elevated Hospitality & Residential Living",
    description: "Launch your hotel or building management with a 6-month free trial.",
    type: "website",
    url: "https://omniheaven.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfair.variable} ${plusJakarta.variable} ${hindSiliguri.variable}`}
    >
      <body className="antialiased bg-[hsl(var(--canvas))] text-[hsl(var(--foreground))] selection:bg-primary/20 selection:text-foreground font-sans transition-colors duration-200">
        <PlausibleTracker />
        <ThemeProvider defaultTheme="light">
          <LanguageProvider defaultLocale="en">{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
