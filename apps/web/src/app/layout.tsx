import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omni Heaven | Hospitality & Property Management Platform",
  description:
    "The all-in-one platform for Hotels, Resorts, Buildings, and Flat Owners. Includes Shopify-style website builder, direct booking engine, and automated renter portals with a 6-month free trial.",
  openGraph: {
    title: "Omni Heaven - Modern Hospitality & Residential Living",
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
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
