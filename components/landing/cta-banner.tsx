"use client";

import { useTranslation } from "@/lib/i18n";
import Link from "next/link";

/**
 * Bottom CTA banner — dark background, green accent button.
 */
export function LandingCtaBanner() {
	const { t } = useTranslation();

	return (
		<section
			className="py-20 md:py-24 px-4 md:px-8 bg-primary"
			aria-labelledby="cta-heading"
		>
			<div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
				<h2
					id="cta-heading"
					className="text-3xl md:text-4xl font-bold text-on-primary leading-tight tracking-[-0.5px]"
				>
					{t("landing.cta.heading")}
				</h2>
				<p className="text-base md:text-lg text-muted max-w-xl leading-relaxed">
					{t("landing.cta.subheading")}
				</p>
				<div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
					<Link
						href="/register"
						className="px-8 py-3.5 rounded-full text-base font-semibold bg-brand-green text-on-dark hover:bg-brand-green-hover transition-colors duration-150 min-h-[48px] flex items-center shadow-[0_2px_8px_rgba(27,166,115,0.3)]"
					>
						{t("landing.cta.primary")}
					</Link>
					<Link
						href="/login"
						className="px-8 py-3.5 rounded-full text-base font-semibold text-on-primary border border-[rgba(255,255,255,0.2)] hover:border-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.05)] transition-colors duration-150 min-h-[48px] flex items-center"
					>
						{t("landing.cta.secondary")}
					</Link>
				</div>
				<p className="text-sm text-stone">{t("landing.cta.note")}</p>
			</div>
		</section>
	);
}
