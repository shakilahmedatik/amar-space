import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omni Heaven Renter Portal | Easy Rent & Flat Services",
  description: "View bills, pay rent, submit maintenance requests, and read building notices",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
