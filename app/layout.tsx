import { Providers } from "@/lib/providers";
import type { Metadata } from "next";
import { DM_Sans, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

/**
 * DM Sans — primary Latin/UI font for AmarSpace.
 * Matches the --font-sans token in globals.css @theme.
 */
const dmSans = DM_Sans({
	subsets: ["latin"],
	variable: "--font-dm-sans",
	display: "swap",
	weight: ["400", "500", "600", "700"],
});

/**
 * Noto Sans Bengali — supports the full Unicode Bengali block (U+0980–U+09FF).
 * Used as the primary font for Bangla text rendering.
 */
const notoSansBengali = Noto_Sans_Bengali({
	subsets: ["bengali"],
	variable: "--font-noto-sans-bengali",
	display: "swap",
	weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
	title: "আমারস্পেস - অ্যাপার্টমেন্ট ব্যবস্থাপনা",
	description:
		"বাংলাদেশের অ্যাপার্টমেন্ট মালিক, ম্যানেজার এবং ভাড়াটিয়াদের জন্য সম্পূর্ণ ব্যবস্থাপনা প্ল্যাটফর্ম",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="bn" suppressHydrationWarning>
			<body
				className={`${dmSans.variable} ${notoSansBengali.variable} font-sans`}
			>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
