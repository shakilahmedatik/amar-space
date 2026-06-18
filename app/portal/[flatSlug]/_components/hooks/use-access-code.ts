"use client";

import { trackEvent } from "@/lib/analytics";
import { BASE_URL } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

interface AccessCodeResponse {
	success: boolean;
	message: string;
	redirectUrl?: string;
}

interface AccessCodeErrorResponse {
	error: string;
	message: string;
	attemptsRemaining?: number;
	lockedUntil?: string;
}

export function useAccessCode(flatSlug: string, onSuccess?: () => void) {
	const { t } = useTranslation();
	const [code, setCode] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
	const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
	const inputRef = useRef<HTMLInputElement>(null);

	// Countdown timer for lockout
	useEffect(() => {
		if (!lockedUntil) {
			setLockoutRemaining(0);
			return;
		}

		const updateRemaining = () => {
			const now = new Date();
			const remaining = Math.max(
				0,
				Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000),
			);
			setLockoutRemaining(remaining);

			if (remaining <= 0) {
				setLockedUntil(null);
				setErrorMessage(null);
			}
		};

		updateRemaining();
		const interval = setInterval(updateRemaining, 1000);
		return () => clearInterval(interval);
	}, [lockedUntil]);

	// Mutation for access code verification
	const accessMutation = useMutation<
		AccessCodeResponse,
		AccessCodeErrorResponse,
		string
	>({
		mutationFn: async (accessCode: string) => {
			const response = await fetch(
				`${BASE_URL}/api/portal/flat/${flatSlug}/access`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ code: accessCode }),
				},
			);

			if (response.status === 401 || response.status === 429) {
				const errorData = (await response.json()) as AccessCodeErrorResponse;
				throw errorData;
			}

			if (!response.ok) {
				throw {
					error: "UNKNOWN",
					message: "সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
				} as AccessCodeErrorResponse;
			}

			return response.json() as Promise<AccessCodeResponse>;
		},
		onSuccess: () => {
			setErrorMessage(null);
			trackEvent("Access Granted", flatSlug);
			if (onSuccess) {
				onSuccess();
			}
		},
		onError: (error) => {
			trackEvent("Access Code Attempted", flatSlug);
			setCode("");
			inputRef.current?.focus();

			const errorMap: Record<string, string> = {
				LOCKED:
					t("renters.lockoutMessage") ||
					"অনেক বার ভুল কোড দেওয়া হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।",
				INVALID_CODE: t("renters.invalidCode") || "অবৈধ অ্যাক্সেস কোড",
				INVALID_CODE_FORMAT:
					t("renters.invalidCodeFormat") || "অ্যাক্সেস কোড ৬ সংখ্যার হতে হবে",
				INVALID_SLUG: t("renters.invalidSlug") || "অবৈধ QR কোড",
				UNKNOWN: t("renters.serverError") || "সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
			};

			const message =
				errorMap[error.error] ||
				error.message ||
				t("common.error") ||
				"একটি ভুল হয়েছে";

			if (error.error === "LOCKED" && error.lockedUntil) {
				setLockedUntil(new Date(error.lockedUntil));
			}
			setErrorMessage(message);
		},
	});

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const filtered = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
			setCode(filtered);

			if (errorMessage && !lockedUntil) {
				setErrorMessage(null);
			}
		},
		[errorMessage, lockedUntil],
	);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();

			if (code.length !== 6) {
				setErrorMessage(
					t("renters.invalidCodeFormat") || "অ্যাক্সেস কোড ৬ সংখ্যার হতে হবে",
				);
				return;
			}

			if (lockedUntil) {
				return;
			}

			accessMutation.mutate(code);
		},
		[code, lockedUntil, accessMutation, t],
	);

	const isLocked = lockedUntil !== null && lockoutRemaining > 0;
	const isSubmitting = accessMutation.isPending;

	return {
		code,
		setCode,
		errorMessage,
		setErrorMessage,
		isLocked,
		lockoutRemaining,
		isSubmitting,
		inputRef,
		handleInputChange,
		handleSubmit,
	};
}
