"use client";

import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { ErrorFeedback } from "@/components/ui/error-feedback";
import { FormField, FormInput } from "@/components/ui/form-field";
import { signUp } from "@/lib/auth-client";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

/**
 * Registration page — /register
 *
 * - Email + password form with Bangla-first labels
 * - Client-side validation: email format (max 254 chars), password strength
 *   (8-128 chars, uppercase, lowercase, digit)
 * - Field-level validation errors
 * - Handle duplicate email error
 * - Handle rate limit error
 * - Redirect to dashboard on success
 * - Accessible: labels, aria attributes, focus management
 * - Mobile-first, 44x44px touch targets, 16px body text
 */
export default function RegisterPage() {
	const { t } = useTranslation();
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<{
		email?: string;
		password?: string;
	}>({});
	const [feedbackMessage, setFeedbackMessage] = useState("");
	const [feedbackType, setFeedbackType] = useState<"error" | "warning">(
		"error",
	);
	const [showFeedback, setShowFeedback] = useState(false);

	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);

	/**
	 * Client-side validation:
	 * - Email: standard format, max 254 chars
	 * - Password: 8-128 chars, at least one uppercase, one lowercase, one digit
	 */
	const validateForm = useCallback((): boolean => {
		const errors: { email?: string; password?: string } = {};

		const trimmedEmail = email.trim();

		// Email validation
		if (!trimmedEmail) {
			errors.email = t("validation.required");
		} else if (trimmedEmail.length > 254) {
			errors.email = t("validation.invalidEmail");
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
			errors.email = t("validation.invalidEmail");
		}

		// Password validation
		if (!password) {
			errors.password = t("validation.required");
		} else if (password.length < 8) {
			errors.password = t("validation.passwordTooShort");
		} else if (password.length > 128) {
			errors.password = t("validation.passwordTooShort");
		} else if (
			!/[A-Z]/.test(password) ||
			!/[a-z]/.test(password) ||
			!/\d/.test(password)
		) {
			errors.password = t("validation.passwordRequirements");
		}

		setFieldErrors(errors);

		// Focus the first field with an error
		if (errors.email) {
			emailRef.current?.focus();
			return false;
		}
		if (errors.password) {
			passwordRef.current?.focus();
			return false;
		}

		return true;
	}, [email, password, t]);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();

			if (!validateForm()) return;

			setIsSubmitting(true);
			setShowFeedback(false);

			try {
				const result = await signUp({
					email: email.trim().toLowerCase(),
					password,
				});

				if (result.error) {
					if (result.error.code === "RATE_LIMIT_EXCEEDED") {
						// rate limit feedback
						setFeedbackMessage(t("auth.rateLimitError"));
						setFeedbackType("warning");
						setShowFeedback(true);
					} else if (result.error.code === "EMAIL_EXISTS") {
						// duplicate email error
						setFieldErrors({ email: t("auth.emailExists") });
						emailRef.current?.focus();
					} else if (
						result.error.code === "VALIDATION_ERROR" &&
						result.error.fieldErrors
					) {
						// field-level validation errors from server
						const serverErrors: { email?: string; password?: string } = {};
						for (const fieldError of result.error.fieldErrors) {
							if (fieldError.field === "email") {
								serverErrors.email = fieldError.message;
							} else if (fieldError.field === "password") {
								serverErrors.password = fieldError.message;
							}
						}
						setFieldErrors(serverErrors);
						if (serverErrors.email) {
							emailRef.current?.focus();
						} else if (serverErrors.password) {
							passwordRef.current?.focus();
						}
					} else {
						// Generic registration error
						setFeedbackMessage(t("auth.registerError"));
						setFeedbackType("error");
						setShowFeedback(true);
					}
				} else {
					// redirect to dashboard on success
					router.push("/dashboard");
				}
			} catch {
				setFeedbackMessage(t("common.error"));
				setFeedbackType("error");
				setShowFeedback(true);
			} finally {
				setIsSubmitting(false);
			}
		},
		[
			email,
			password,
			validateForm,
			t, // redirect to dashboard on success
			router.push,
		],
	);

	return (
		<AuthLayout>
			<ErrorFeedback
				message={feedbackMessage}
				type={feedbackType}
				visible={showFeedback}
				onDismiss={() => setShowFeedback(false)}
			/>

			<h2 className="text-xl font-semibold mb-6 text-center text-ink">
				{t("auth.registerTitle")}
			</h2>

			<form onSubmit={handleSubmit} noValidate>
				<FormField
					label={t("auth.email")}
					error={fieldErrors.email}
					required
					htmlFor="register-email"
				>
					<FormInput
						ref={emailRef}
						id="register-email"
						type="email"
						name="email"
						autoComplete="email"
						value={email}
						onChange={(e) => {
							setEmail(e.target.value);
							if (fieldErrors.email) {
								setFieldErrors((prev) => ({ ...prev, email: undefined }));
							}
						}}
						hasError={!!fieldErrors.email}
						aria-describedby={
							fieldErrors.email ? "register-email-error" : undefined
						}
						disabled={isSubmitting}
						placeholder="example@email.com"
					/>
				</FormField>

				<FormField
					label={t("auth.password")}
					error={fieldErrors.password}
					required
					htmlFor="register-password"
					helpText={t("validation.passwordRequirements")}
				>
					<FormInput
						ref={passwordRef}
						id="register-password"
						type="password"
						name="password"
						autoComplete="new-password"
						value={password}
						onChange={(e) => {
							setPassword(e.target.value);
							if (fieldErrors.password) {
								setFieldErrors((prev) => ({ ...prev, password: undefined }));
							}
						}}
						hasError={!!fieldErrors.password}
						aria-describedby={
							fieldErrors.password
								? "register-password-error"
								: "register-password-help"
						}
						disabled={isSubmitting}
					/>
				</FormField>

				<Button
					type="submit"
					disabled={isSubmitting}
					className="w-full min-h-11 rounded-full mt-6 text-base font-semibold"
					aria-busy={isSubmitting}
				>
					{isSubmitting ? t("common.loading") : t("auth.register")}
				</Button>
			</form>

			<p className="mt-6 text-center text-sm text-steel">
				{t("auth.hasAccount")}{" "}
				<Link
					href="/login"
					className="text-brand-blue-deep font-medium underline"
				>
					{t("auth.login")}
				</Link>
			</p>
		</AuthLayout>
	);
}
