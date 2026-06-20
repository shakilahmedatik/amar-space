"use client";

import {
	SESSION_EXPIRED_BANGLA_MESSAGE,
	SESSION_EXPIRED_PARAM,
} from "@/hooks/use-session-expiry";
import { Clock } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function SessionExpiredBanner() {
	const searchParams = useSearchParams();
	const isSessionExpired = searchParams.get(SESSION_EXPIRED_PARAM) === "true";

	if (!isSessionExpired) {
		return null;
	}

	return (
		<div
			className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
			role="alert"
			aria-live="polite"
		>
			<Clock className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
			<p className="text-sm font-medium text-amber-800">
				{SESSION_EXPIRED_BANGLA_MESSAGE}
			</p>
		</div>
	);
}
