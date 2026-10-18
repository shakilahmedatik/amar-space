import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { RenterTRPCProvider } from "../components/trpc-provider";
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

export const metadata: Metadata = {
  title: "omniHeaven Resident Portal | Easy Rent & Flat Services",
  description: "View bills, pay rent, submit maintenance requests, and read building notices",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-[hsl(var(--canvas))] text-[hsl(var(--foreground))] antialiased font-sans selection:bg-primary/20 selection:text-foreground">
        <RenterTRPCProvider>{children}</RenterTRPCProvider>
      </body>
    </html>
  );
}
