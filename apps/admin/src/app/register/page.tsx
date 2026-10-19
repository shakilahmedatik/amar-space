"use client";

import { signUp } from "@omniheaven/auth/client";
import { AuthLayout, Button, Input } from "@omniheaven/ui";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminRegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your work email.");
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
    if (!agreeTerms) {
      setError("You must agree to the Terms of Service to proceed.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { error: signUpError } = await signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (signUpError) {
        setError(signUpError.message || "Failed to create account. Email may already be in use.");
        setIsLoading(false);
        return;
      }

      // Automatically route new managers to property onboarding
      router.push("/onboarding");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred during registration.",
      );
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Manager Account"
      subtitle="Activate your 6-month free trial. Manage hotels, guest suites, residential flats, and automated billing."
      badge="6-Month Free Trial Active"
    >
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

        {/* Full Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="name"
            className="block text-xs font-bold uppercase tracking-wider text-foreground"
          >
            Full Name
          </label>
          <div className="relative">
            <User className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
            <Input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sultana Ahmed"
              className="pl-9 text-xs h-10"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Work Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-bold uppercase tracking-wider text-foreground"
          >
            Work Email
          </label>
          <div className="relative">
            <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sultana@grandhaven.com"
              className="pl-9 text-xs h-10"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-bold uppercase tracking-wider text-foreground"
          >
            Password (min 8 chars)
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
            Confirm Password
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

        {/* Agreement */}
        <div className="flex items-start gap-2 pt-1">
          <input
            id="terms"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="size-4 mt-0.5 rounded border-border text-primary focus:ring-primary/20 accent-[#C5A880]"
          />
          <label
            htmlFor="terms"
            className="text-[11px] text-foreground-muted select-none leading-tight cursor-pointer"
          >
            I agree to the omniHeaven Commercial SaaS Terms of Service and Privacy Policy.
          </label>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="luxury"
          disabled={isLoading}
          className="w-full h-11 text-xs uppercase tracking-wider font-bold shadow-md"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Creating Workspace...
            </>
          ) : (
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              Activate 6-Month Free Trial
            </span>
          )}
        </Button>

        {/* Login Link */}
        <div className="text-center pt-2">
          <p className="text-xs text-foreground-muted">
            Already registered as a property manager?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary underline underline-offset-2 hover:opacity-85"
            >
              Sign In
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
