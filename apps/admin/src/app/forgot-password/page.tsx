"use client";

import { requestPasswordReset } from "@omniheaven/auth/client";
import { AuthLayout, Button, Input } from "@omniheaven/ui";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GuestGuard } from "@/components/guest-guard";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your work email.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const redirectOrigin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const redirectTo = `${redirectOrigin}/reset-password`;

      const { error: resetError } = await requestPasswordReset({
        email: email.trim(),
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message || "Failed to dispatch password recovery email.");
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

  return (
    <GuestGuard>
      <AuthLayout
        title="Password Recovery"
        subtitle="Enter the verified email linked to your property management account to receive reset instructions."
        badge="Account Security"
      >
        {isSuccess ? (
          <div className="space-y-4 text-center py-2">
            <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="size-6" />
            </div>
            <h2 className="text-base font-bold text-foreground">Password Reset Email Dispatched</h2>
            <p className="text-xs text-foreground-muted leading-relaxed">
              If an account exists for <strong className="text-foreground">{email}</strong>, a
              secure password recovery link has been delivered to your inbox.
            </p>
            <div className="pt-3">
              <Button asChild variant="outline" className="w-full h-10 text-xs">
                <Link href="/login" className="flex items-center justify-center gap-2">
                  <ArrowLeft className="size-4" />
                  Return to Sign In
                </Link>
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

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-foreground"
              >
                Registered Work Email
              </label>
              <div className="relative">
                <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@grandhaven.com"
                  className="pl-9 text-xs h-10"
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
                  Dispatching Link...
                </>
              ) : (
                "Send Password Reset Link"
              )}
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors font-medium"
              >
                <ArrowLeft className="size-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </AuthLayout>
    </GuestGuard>
  );
}
