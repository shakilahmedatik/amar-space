"use client";

import { signIn } from "@omniheaven/auth/client";
import { AuthLayout, Button, Input } from "@omniheaven/ui";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Eye,
  EyeOff,
  Home,
  Hotel,
  Loader2,
  Lock,
  Mail,
  Palmtree,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GuestGuard } from "@/components/guest-guard";

const DEV_PERSONAS = [
  {
    role: "Building Owner",
    org: "Bashundhara Royal Heights",
    email: "owner.building@omniheaven.com",
    badge: "Building",
    icon: Building2,
  },
  {
    role: "Flat Landlord",
    org: "Gulshan Lakeview Suites",
    email: "owner.flat@omniheaven.com",
    badge: "Flat",
    icon: Home,
  },
  {
    role: "Hotel Owner",
    org: "Grand Haven Luxury Resort",
    email: "owner.hotel@omniheaven.com",
    badge: "Hotel",
    icon: Hotel,
  },
  {
    role: "Resort Owner",
    org: "Sreemangal Tea Valley",
    email: "owner.resort@omniheaven.com",
    badge: "Resort",
    icon: Palmtree,
  },
  {
    role: "Commercial Owner",
    org: "Banani Commercial Complex",
    email: "owner.commercial@omniheaven.com",
    badge: "Commercial",
    icon: Briefcase,
  },
  {
    role: "Society President",
    org: "Uttara Sector 7 Society",
    email: "owner.society@omniheaven.com",
    badge: "Society",
    icon: Users,
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activePersonaEmail, setActivePersonaEmail] = useState<string | null>(null);
  // Demo personas use shared seeded credentials; never expose them in a
  // production build. Next inlines NODE_ENV so this branch is removed.
  const isDevMode = process.env.NODE_ENV === "development";

  const handleQuickLogin = async (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword("Password123!");
    setError(null);
    setIsLoading(true);
    setActivePersonaEmail(targetEmail);

    try {
      const { error: signInError } = await signIn.email({
        email: targetEmail,
        password: "Password123!",
        rememberMe: true,
      });

      if (signInError) {
        setError(signInError.message || "Quick dev login failed.");
        setIsLoading(false);
        setActivePersonaEmail(null);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication error.");
      setIsLoading(false);
      setActivePersonaEmail(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await signIn.email({
        email: email.trim(),
        password,
        rememberMe,
      });

      if (signInError) {
        setError(
          signInError.message || "Invalid credentials. Please check your email and password.",
        );
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred during sign in.");
      setIsLoading(false);
    }
  };

  return (
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

      {/* Email input */}
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
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner.building@omniheaven.com"
            className="pl-9 text-xs h-10"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Password input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-xs font-bold uppercase tracking-wider text-foreground"
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
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

      {/* Remember me */}
      <div className="flex items-center gap-2 pt-0.5">
        <input
          id="remember-me"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="size-4 rounded border-border text-primary focus:ring-primary/20 accent-[#C5A880]"
        />
        <label
          htmlFor="remember-me"
          className="text-xs text-foreground-muted select-none cursor-pointer"
        >
          Remember this device for 7 days
        </label>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="luxury"
        disabled={isLoading}
        className="w-full h-11 text-xs uppercase tracking-wider font-bold shadow-md"
      >
        {isLoading && !activePersonaEmail ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Authenticating...
          </>
        ) : (
          "Sign In to Management Console"
        )}
      </Button>

      {/* Registration Link */}
      <div className="text-center pt-1">
        <p className="text-xs text-foreground-muted">
          New property or hotel manager?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary underline underline-offset-2 hover:opacity-85"
          >
            Create an account (6-Month Free Trial)
          </Link>
        </p>
      </div>

      {/* Dev Mode Quick Demo Login Section */}
      {isDevMode && (
        <div className="pt-4 border-t border-border/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Zap className="size-3.5 fill-primary" />
              Quick Demo Login (Dev Mode)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
              Password123!
            </span>
          </div>

          <p className="text-[11px] text-foreground-muted leading-tight">
            Click any persona below to authenticate instantly with seeded demo accounts:
          </p>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            {DEV_PERSONAS.map((p) => {
              const Icon = p.icon;
              const isThisPersonaLoading = isLoading && activePersonaEmail === p.email;
              return (
                <button
                  key={p.email}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin(p.email)}
                  className="group relative flex flex-col items-start p-2.5 rounded-xl border border-border/80 bg-surface/60 hover:bg-surface-elevated hover:border-primary/50 text-left transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[10px] font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                      {isThisPersonaLoading ? (
                        <Loader2 className="size-3 animate-spin text-primary" />
                      ) : (
                        <Icon className="size-3 text-primary shrink-0" />
                      )}
                      <span className="truncate">{p.role}</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-border text-foreground-muted font-mono shrink-0">
                      {p.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-foreground-muted truncate w-full">{p.org}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <GuestGuard>
      <AuthLayout
        title="Property & Hotel Operations"
        subtitle="Sign in with your verified credentials to access your unified property management system."
        badge="Hospitality & Property Console"
      >
        <Suspense
          fallback={
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </AuthLayout>
    </GuestGuard>
  );
}
