import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omni Heaven HQ | Platform Command Center",
  description: "Global tenant management, subscription health, and platform analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
