"use client";

import { useTranslation } from "@/lib/i18n";
import Link from "next/link";

/**
 * Pricing section — two tiers: Free and Pro.
 * Pro card uses primary (black) background for contrast.
 */
export function LandingPricing() {
	const { t } = useTranslation();

	const plans = [
		{
			name: t("landing.pricing.freeName"),
			price: t("landing.pricing.freePrice"),
			period: "",
			desc: t("landing.pricing.freeDesc"),
			features: [
				t("landing.pricing.freeF1"),
				t("landing.pricing.freeF2"),
				t("landing.pricing.freeF3"),
				t("landing.pricing.freeF4"),
			],
			cta: t("landing.pricing.freeCta"),
			ctaHref: "/register",
			highlight: false,
		},
		{
			name: t("landing.pricing.proName"),
			price: t("landing.pricing.proPrice"),
			period: t("landing.pricing.proPeriod"),
			desc: t("landing.pricing.proDesc"),
			features: [
				t("landing.pricing.proF1"),
				t("landing.pricing.proF2"),
				t("landing.pricing.proF3"),
				t("landing.pricing.proF4"),
				t("landing.pricing.proF5"),
			],
			cta: t("landing.pricing.proCta"),
			ctaHref: "/register",
			highlight: true,
		},
	];

	return (
		<section
			id="pricing"
			className="py-20 md:py-28 px-4 md:px-8 bg-surface"
			aria-labelledby="pricing-heading"
		>
			<div className="max-w-4xl mx-auto">
				<div className="text-center mb-14">
					<span className="text-sm font-semibold text-brand-orange uppercase tracking-widest">
						{t("landing.pricing.eyebrow")}
					</span>
					<h2
						id="pricing-heading"
						className="mt-3 text-3xl md:text-4xl font-bold text-ink tracking-[-0.5px]"
					>
						{t("landing.pricing.heading")}
					</h2>
					<p className="mt-4 text-base text-slate max-w-md mx-auto">
						{t("landing.pricing.subheading")}
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
					{plans.map((plan) => (
						<div
							key={plan.name}
							className={[
								"rounded-2xl p-7 flex flex-col gap-6 border",
								plan.highlight
									? "bg-primary border-primary text-on-primary shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
									: "bg-canvas border-hairline",
							].join(" ")}
						>
							<div>
								<p
									className={`text-sm font-semibold uppercase tracking-widest mb-3 ${plan.highlight ? "text-brand-green" : "text-steel"}`}
								>
									{plan.name}
								</p>
								<div className="flex items-end gap-1">
									<span
										className={`text-4xl font-bold leading-none ${plan.highlight ? "text-on-primary" : "text-ink"}`}
									>
										{plan.price}
									</span>
									{plan.period && (
										<span
											className={`text-sm mb-1 ${plan.highlight ? "text-muted" : "text-stone"}`}
										>
											{plan.period}
										</span>
									)}
								</div>
								<p
									className={`mt-2 text-sm leading-relaxed ${plan.highlight ? "text-muted" : "text-slate"}`}
								>
									{plan.desc}
								</p>
							</div>

							<ul className="flex flex-col gap-3">
								{plan.features.map((f) => (
									<li key={f} className="flex items-start gap-2.5 text-sm">
										<svg
											width="16"
											height="16"
											viewBox="0 0 16 16"
											fill="none"
											className={`mt-0.5 shrink-0 ${plan.highlight ? "text-brand-green" : "text-brand-green"}`}
											aria-hidden="true"
										>
											<circle
												cx="8"
												cy="8"
												r="7"
												stroke="currentColor"
												strokeWidth="1.5"
											/>
											<path
												d="M5 8l2 2 4-4"
												stroke="currentColor"
												strokeWidth="1.5"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
										<span
											className={
												plan.highlight ? "text-on-primary" : "text-charcoal"
											}
										>
											{f}
										</span>
									</li>
								))}
							</ul>

							<Link
								href={plan.ctaHref}
								className={[
									"mt-auto px-6 py-3 rounded-full text-sm font-semibold text-center min-h-11 flex items-center justify-center transition-colors duration-150",
									plan.highlight
										? "bg-brand-green text-on-dark hover:bg-brand-green-hover"
										: "bg-primary text-on-primary hover:bg-charcoal",
								].join(" ")}
							>
								{plan.cta}
							</Link>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
