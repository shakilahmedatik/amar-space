"use client";

import { signOut } from "@/lib/auth-client";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { NavIcon } from "./nav-icon";

interface TopNavbarProps {
	onNavigate?: (href: string) => void;
}

/**
 * Fixed top navbar for the content area (desktop only on md+, visible on all viewports).
 * Contains: Home link, Language toggle, Logout button.
 *
 * Sits above the scrollable content area, below the sidebar header level.
 */
export function TopNavbar({ onNavigate }: TopNavbarProps) {
	const { t, locale, setLocale } = useTranslation();
	const router = useRouter();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const handleHome = useCallback(
		(e: React.MouseEvent) => {
			if (onNavigate) {
				e.preventDefault();
				onNavigate("/dashboard");
			}
		},
		[onNavigate],
	);

	const handleLanguageToggle = useCallback(() => {
		setLocale(locale === "bn" ? "en" : "bn");
	}, [locale, setLocale]);

	const handleLogout = useCallback(async () => {
		setIsLoggingOut(true);
		try {
			await signOut();
			router.push("/login");
		} catch {
			setIsLoggingOut(false);
		}
	}, [router]);

	return (
		<header className="sticky top-0 z-40 flex items-center justify-end gap-2 px-4 md:px-6 py-3 border-b border-hairline bg-canvas shrink-0">
			{/* Home */}
			<Link
				href="/dashboard"
				onClick={handleHome}
				className="flex items-center gap-2 min-h-11 min-w-[44px] px-3 rounded-lg text-sm font-medium text-charcoal hover:bg-surface hover:text-ink transition-colors duration-150"
				aria-label={t("nav.dashboard")}
			>
				<NavIcon name="home" />
				<span className="hidden sm:inline">{t("nav.dashboard")}</span>
			</Link>

			<div className="flex-1" />

			{/* Language toggle */}
			<button
				type="button"
				onClick={handleLanguageToggle}
				className="flex items-center gap-2 min-h-11 min-w-[44px] px-3 rounded-lg text-sm font-medium text-charcoal hover:bg-surface hover:text-ink transition-colors duration-150"
				aria-label={t("common.language")}
			>
				<NavIcon name="globe" />
				<span className="hidden sm:inline">
					{locale === "bn" ? t("common.english") : t("common.bangla")}
				</span>
			</button>

			{/* Logout */}
			<button
				type="button"
				onClick={handleLogout}
				disabled={isLoggingOut}
				className="flex items-center gap-2 min-h-11 min-w-[44px] px-3 rounded-lg text-sm font-medium text-error-text hover:bg-error-bg transition-colors duration-150 disabled:opacity-50"
				aria-label={t("common.logout")}
			>
				<NavIcon name="log-out" />
				<span className="hidden sm:inline">{t("common.logout")}</span>
			</button>
		</header>
	);
}
