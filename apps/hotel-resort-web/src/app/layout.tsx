import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { TRPCProvider } from "../components/trpc-provider";
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
  title: "omniHeaven Luxury Hotel & Resort Guest Experience",
  description: "Next-generation customer-facing luxury hotel and resort direct booking experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-[hsl(var(--canvas))] text-[hsl(var(--foreground))] antialiased font-sans selection:bg-primary/20 selection:text-foreground">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
