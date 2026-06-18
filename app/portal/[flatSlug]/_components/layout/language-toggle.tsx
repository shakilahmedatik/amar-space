"use client";

import { useTranslation } from "@/lib/i18n";

export function LanguageToggle() {
	const { locale, setLocale } = useTranslation();

	const handleToggle = () => {
		setLocale(locale === "bn" ? "en" : "bn");
	};

	return (
		<div className="fixed bottom-6 right-6 z-50">
			<button
				type="button"
				onClick={handleToggle}
				className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue-deep text-white shadow-lg shadow-brand-blue-deep/20 transition-all hover:bg-brand-blue-deep/90 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-blue-deep focus:ring-offset-2 border border-white/10"
				aria-label={locale === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
			>
				<span className="text-sm font-semibold tracking-wider">
					{locale === "bn" ? "EN" : "বাং"}
				</span>
			</button>
		</div>
	);
}
