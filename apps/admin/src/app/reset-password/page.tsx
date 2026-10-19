"use client";

import { resetPassword } from "@omniheaven/auth/client";
import { AuthLayout, Button, Input } from "@omniheaven/ui";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    tokenError ? "Invalid or expired password reset link. Please request a new one." : null,
  );
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("No reset token provided. Please use the link sent to your email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { error: apiError } = await resetPassword({
        newPassword: password,
        token,
      });

      if (apiError) {
        setError(apiError.message || "Failed to reset password. The link may have expired.");
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  if (!token && !tokenError) {
    return (
      <div className="space-y-4 text-center py-2">
        <div className="size-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-500/20">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">Missing Reset Token</h2>
        <p className="text-xs text-foreground-muted leading-relaxed">
          Please access this page by clicking the secure link delivered to your email inbox.
        </p>
        <div className="pt-3">
          <Button asChild variant="outline" className="w-full h-10 text-xs">
            <Link href="/forgot-password">Request Reset Link</Link>
          </Button>
        </div>
      </div>
    );
  }

  return isSuccess ? (
    <div className="space-y-4 text-center py-2">
      <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
        <CheckCircle2 className="size-6" />
      </div>
      <h2 className="text-base font-bold text-foreground">Password Successfully Updated</h2>
      <p className="text-xs text-foreground-muted leading-relaxed">
        Your password has been securely updated. You can now sign in with your new credentials.
      </p>
      <div className="pt-3">
        <Button asChild variant="luxury" className="w-full h-10 text-xs">
          <Link href="/login">Sign In with New Password</Link>
        </Button>
      </div>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* New Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-xs font-bold uppercase tracking-wider text-foreground"
        >
          New Password (min 8 chars)
        </label>
        <div className="relative">
          <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="pl-9 pr-9 text-xs h-10 font-sans"
            disabled={isLoading}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="confirm-password"
          className="block text-xs font-bold uppercase tracking-wider text-foreground"
        >
          Confirm New Password
        </label>
        <div className="relative">
          <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
          <Input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••••••"
            className="pl-9 text-xs h-10 font-sans"
            disabled={isLoading}
          />
        </div>
      </div>

      <Button
        type="submit"
        variant="luxury"
        disabled={isLoading}
        className="w-full h-11 text-xs uppercase tracking-wider font-bold shadow-md"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Updating Password...
          </>
        ) : (
          "Save New Password"
        )}
      </Button>

      <div className="text-center pt-2">
        <Link
          href="/login"
          className="text-xs text-foreground-muted hover:text-foreground transition-colors"
        >
          Cancel and return to Sign In
        </Link>
      </div>
    </form>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <AuthLayout
      title="Set New Password"
      subtitle="Ensure your new account password is at least 8 characters with numbers and symbols."
      badge="Security Verification"
    >
      <Suspense
        fallback={
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
