import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omni Heaven Hotel & Resort Platform",
  description: "Next-generation customer-facing hotel and resort web experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
