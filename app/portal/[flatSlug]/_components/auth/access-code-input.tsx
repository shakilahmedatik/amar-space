"use client";

import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { KeyRound, Lock, ShieldAlert } from "lucide-react";
import { Fragment, useState } from "react";
import { useAccessCode } from "../hooks/use-access-code";

interface AccessCodeInputProps {
	flatSlug: string;
	flatStatus: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
	className?: string;
	onSuccess?: () => void;
}

const BANGLA_DIGITS: Record<string, string> = {
	"0": "০",
	"1": "১",
	"2": "২",
	"3": "৩",
	"4": "৪",
	"5": "৫",
	"6": "৬",
	"7": "৭",
	"8": "৮",
	"9": "৯",
};

function toBanglaNumerals(num: number): string {
	return String(num).replace(
		/[0-9]/g,
		(digit) => BANGLA_DIGITS[digit] || digit,
	);
}

function formatLockoutTime(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	if (minutes > 0 && remainingSeconds > 0) {
		return `${toBanglaNumerals(minutes)} মিনিট ${toBanglaNumerals(remainingSeconds)} সেকেন্ড`;
	}
	if (minutes > 0) {
		return `${toBanglaNumerals(minutes)} মিনিট`;
	}
	return `${toBanglaNumerals(remainingSeconds)} সেকেন্ড`;
}

export function AccessCodeInput({
	flatSlug,
	flatStatus,
	className,
	onSuccess,
}: AccessCodeInputProps) {
	const { t } = useTranslation();
	const [isFocused, setIsFocused] = useState(false);
	const {
		code,
		errorMessage,
		isLocked,
		lockoutRemaining,
		isSubmitting,
		inputRef,
		handleInputChange,
		handleSubmit,
	} = useAccessCode(flatSlug, onSuccess);

	if (flatStatus !== "OCCUPIED") {
		return null;
	}

	return (
		<section
			aria-label="রেন্টার অ্যাক্সেস"
			className={cn("flex flex-col gap-4", className)}
		>
			<h2 className="flex items-center gap-2 text-lg font-bold text-ink">
				<KeyRound className="h-5 w-5 text-brand-blue-deep" aria-hidden />
				{t("renters.accessCodeLabel") || "রেন্টার অ্যাক্সেস"}
			</h2>

			<div className="rounded-lg border border-hairline bg-white p-5">
				<p className="mb-4 text-base text-steel">
					{t("renters.accessCodePrompt") ||
						"আপনার ড্যাশবোর্ডে প্রবেশ করতে ৬ সংখ্যার অ্যাক্সেস কোড দিন"}
				</p>

				{isLocked && (
					<div
						className="mb-4 flex items-center gap-3 rounded-lg bg-error-bg p-4"
						role="alert"
					>
						<Lock className="h-5 w-5 shrink-0 text-error-text" aria-hidden />
						<div className="min-w-0">
							<p className="text-base font-medium text-error-text">
								{t("renters.accessLocked") || "অ্যাক্সেস কোড লক করা হয়েছে"}
							</p>
							<p className="mt-1 text-base text-error-text/80">
								{formatLockoutTime(lockoutRemaining)}{" "}
								{t("renters.tryAgainAfter") || "পর আবার চেষ্টা করুন"}
							</p>
						</div>
					</div>
				)}

				<form onSubmit={handleSubmit} className="flex flex-col gap-3">
					<div>
						<label
							htmlFor="access-code"
							className="mb-3 block text-base font-medium text-ink text-center"
						>
							{t("renters.accessCodeLabel") || "অ্যাক্সেস কোড"}
						</label>

						<div className="relative w-full max-w-[320px] mx-auto py-2">
							{/* Invisible underlying input */}
							<input
								ref={inputRef}
								id="access-code"
								type="text"
								inputMode="numeric"
								pattern="[0-9]*"
								maxLength={6}
								value={code}
								onChange={handleInputChange}
								onFocus={() => setIsFocused(true)}
								onBlur={() => setIsFocused(false)}
								disabled={isLocked || isSubmitting}
								autoComplete="one-time-code"
								className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed"
								aria-invalid={!!errorMessage}
								aria-describedby={
									errorMessage ? "access-code-error" : undefined
								}
							/>

							{/* Display slots */}
							<div className="flex items-center justify-center gap-2 pointer-events-none select-none">
								{Array.from({ length: 6 }).map((_, index) => {
									const char = code[index] || "";
									const isActiveSlot =
										isFocused && index === Math.min(code.length, 5);
									const showCaret = isFocused && index === code.length;

									return (
										<Fragment key={index}>
											<div
												className={cn(
													"w-11 h-14 border text-xl font-bold flex items-center justify-center rounded-lg bg-white transition-all shadow-sm",
													isActiveSlot &&
														"ring-2 ring-primary ring-offset-2 border-primary",
													!isActiveSlot &&
														errorMessage &&
														!isLocked &&
														"border-error-text bg-error-bg/30 text-error-text",
													!isActiveSlot &&
														(!errorMessage || isLocked) &&
														"border-hairline text-ink",
													isLocked && "opacity-50 bg-surface",
												)}
											>
												{char}
												{showCaret && (
													<span className="animate-caret-blink h-6 w-0.5 bg-ink" />
												)}
											</div>
											{index === 2 && (
												<div className="text-steel font-bold text-lg px-0.5">
													-
												</div>
											)}
										</Fragment>
									);
								})}
							</div>

							{/* Blinking Caret CSS */}
							<style>{`
                @keyframes caret-blink {
                  0%, 70%, 100% { opacity: 1; }
                  35%, 65% { opacity: 0; }
                }
                .animate-caret-blink {
                  animation: caret-blink 1s ease-in-out infinite;
                }
              `}</style>
						</div>
					</div>

					{errorMessage && !isLocked && (
						<div
							id="access-code-error"
							className="flex items-center gap-2 text-base text-error-text"
							role="alert"
						>
							<ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
							<span>{errorMessage}</span>
						</div>
					)}

					<button
						type="submit"
						disabled={code.length !== 6 || isLocked || isSubmitting}
						className={cn(
							"flex cursor-pointer min-h-[48px] items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-medium transition-colors",
							"bg-primary text-white",
							"hover:bg-primary/90 active:bg-primary/80",
							"disabled:cursor-not-allowed disabled:opacity-50",
						)}
					>
						<KeyRound className="h-5 w-5" aria-hidden />
						{isSubmitting
							? t("common.loading") || "যাচাই করা হচ্ছে..."
							: t("auth.login") || "প্রবেশ করুন"}
					</button>
				</form>
			</div>
		</section>
	);
}
