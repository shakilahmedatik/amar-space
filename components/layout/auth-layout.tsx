"use client";

import { LanguageToggle } from "@/components/language-toggle";
import { useTranslation } from "@/lib/i18n";
import type { ReactNode } from "react";

interface AuthLayoutProps {
	children: ReactNode;
}

/**
 * Layout for authentication pages (login/register).
 * No navigation, centered content, language toggle in top-right.
 * Mobile-first, elderly-friendly design.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
	const { t } = useTranslation();

	return (
		<div className="bg-surface min-h-dvh flex flex-col items-center justify-center p-4">
			{/* Language toggle - top right */}
			<div className="fixed top-4 right-4 z-10">
				<LanguageToggle />
			</div>

			{/* App branding */}
			<div className="text-center mb-8">
				<h1 className="text-[1.75rem] font-bold text-ink">
					{t("common.appName")}
				</h1>
			</div>

			{/* Auth form container */}
			<div className="w-full max-w-[400px] bg-canvas rounded-xl border border-hairline p-6 shadow-sm">
				{children}
			</div>
		</div>
	);
}
