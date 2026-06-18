"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

/**
 * Error boundary for the portal page.
 * Displays Bangla error messages with a retry button.
 */
export default function PortalError({ error, reset }: ErrorProps) {
	return (
		<div
			className="flex flex-col items-center justify-center gap-4 rounded-lg border border-hairline bg-error-bg p-8 text-center"
			role="alert"
		>
			<AlertCircle className="h-12 w-12 text-error-text" aria-hidden />
			<h1 className="text-lg font-semibold text-error-text">সমস্যা হয়েছে</h1>
			<p className="text-base text-steel">
				{error.message || "সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"}
			</p>
			<button
				type="button"
				onClick={reset}
				className="inline-flex min-h-[48px] min-w-[48px] items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-on-primary transition-colors hover:bg-primary-soft focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
			>
				<RefreshCw className="h-4 w-4" aria-hidden />
				আবার চেষ্টা করুন
			</button>
		</div>
	);
}
