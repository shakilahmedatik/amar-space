"use client";

import { signIn } from "@omniheaven/auth/client";
import { AuthLayout, Button, Input } from "@omniheaven/ui";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, ShieldAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SuperAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide superadmin credentials.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await signIn.email({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || "Invalid superadmin credentials.");
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* SuperAdmin Email */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-xs font-bold uppercase tracking-wider text-foreground"
        >
          SuperAdmin Account Email
        </label>
        <div className="relative">
          <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@omniheaven.com"
            className="pl-9 text-xs h-10 font-mono"
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
          Authorization Key / Password
        </label>
        <div className="relative">
          <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="pl-9 pr-9 text-xs h-10 font-mono"
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

      <Button
        type="submit"
        variant="luxury"
        disabled={isLoading}
        className="w-full h-11 text-xs uppercase tracking-wider font-bold shadow-lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Verifying HQ Permissions...
          </>
        ) : (
          <span className="flex items-center gap-2">
            <ShieldAlert className="size-4" />
            Authenticate Platform HQ
          </span>
        )}
      </Button>

      <div className="pt-2 text-center">
        <p className="text-[10px] text-foreground-muted uppercase tracking-wider font-medium">
          Confidential · Internal Systems Only
        </p>
      </div>
    </form>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <AuthLayout
      title="Platform HQ Command Center"
      subtitle="Restricted access zone. Global SaaS tenant governance and platform telemetry."
      badge="Root Governance · Level 5"
    >
      <Suspense
        fallback={
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        }
      >
        <SuperAdminLoginForm />
      </Suspense>
    </AuthLayout>
  );
}
