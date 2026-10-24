"use client";

import { useSession } from "@omniheaven/auth/client";
import { Loader2, ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requiredRole = "superadmin",
  redirectTo = "/login",
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      const callbackUrl = encodeURIComponent(pathname || "/");
      router.replace(`${redirectTo}?callbackUrl=${callbackUrl}`);
      return;
    }

    if (requiredRole) {
      const userRole = (session.user as { globalRole?: string | null })?.globalRole;
      if (userRole !== requiredRole && userRole !== "admin") {
        router.replace(`${redirectTo}?error=unauthorized_role`);
      }
    }
  }, [session, isPending, router, pathname, requiredRole, redirectTo]);

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--canvas))] text-[hsl(var(--foreground))]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-foreground-muted animate-pulse">
            Verifying Platform SuperAdmin Credentials...
          </p>
        </div>
      </div>
    );
  }

  if (requiredRole) {
    const userRole = (session.user as { globalRole?: string | null })?.globalRole;
    if (userRole !== requiredRole && userRole !== "admin") {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--canvas))] text-foreground p-4">
          <div className="max-w-md w-full bg-card border border-rose-500/30 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <div className="size-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <ShieldAlert className="size-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
            <p className="text-xs text-foreground-muted">
              Your account does not possess global platform superadministrator privileges. This
              console is restricted to authorized platform personnel.
            </p>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="text-xs font-bold text-primary underline underline-offset-4 hover:opacity-80"
            >
              Return to Login
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
