"use client";

import { useTranslation } from "@/lib/i18n";

/**
 * How It Works — 3-step process with connecting line.
 */
export function LandingHowItWorks() {
	const { t } = useTranslation();

	const steps = [
		{
			number: "০১",
			title: t("landing.how.s1Title"),
			desc: t("landing.how.s1Desc"),
			color: "bg-primary text-on-primary",
		},
		{
			number: "০২",
			title: t("landing.how.s2Title"),
			desc: t("landing.how.s2Desc"),
			color: "bg-brand-green text-on-dark",
		},
		{
			number: "০৩",
			title: t("landing.how.s3Title"),
			desc: t("landing.how.s3Desc"),
			color: "bg-brand-blue-deep text-on-dark",
		},
	];

	return (
		<section
			id="how-it-works"
			className="py-20 md:py-28 px-4 md:px-8 bg-canvas"
			aria-labelledby="how-heading"
		>
			<div className="max-w-5xl mx-auto">
				<div className="text-center mb-14">
					<span className="text-sm font-semibold text-brand-blue-deep uppercase tracking-widest">
						{t("landing.how.eyebrow")}
					</span>
					<h2
						id="how-heading"
						className="mt-3 text-3xl md:text-4xl font-bold text-ink tracking-[-0.5px]"
					>
						{t("landing.how.heading")}
					</h2>
				</div>

				<div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
					{/* Connecting line — desktop only */}
					<div
						className="hidden md:block absolute top-8 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-hairline"
						aria-hidden="true"
					/>

					{steps.map((step, i) => (
						<div
							key={step.number}
							className="flex flex-col items-center text-center gap-4 relative"
						>
							{/* Step number bubble */}
							<div
								className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 z-10 ${step.color}`}
							>
								{step.number}
							</div>
							{/* Mobile connector */}
							{i < steps.length - 1 && (
								<div
									className="md:hidden w-px h-8 bg-hairline"
									aria-hidden="true"
								/>
							)}
							<div>
								<h3 className="text-lg font-semibold text-ink mb-2">
									{step.title}
								</h3>
								<p className="text-sm text-slate leading-relaxed max-w-xs mx-auto">
									{step.desc}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
