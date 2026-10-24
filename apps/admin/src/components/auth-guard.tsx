"use client";

import { useSession } from "@omniheaven/auth/client";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export function AuthGuard({ children, requiredRole, redirectTo = "/login" }: AuthGuardProps) {
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
      if (userRole !== requiredRole) {
        router.replace(`${redirectTo}?error=unauthorized_role`);
      }
    }
  }, [session, isPending, router, pathname, requiredRole, redirectTo]);

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--canvas))] text-[hsl(var(--foreground))]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted animate-pulse">
            Verifying security credentials...
          </p>
        </div>
      </div>
    );
  }

  if (requiredRole) {
    const userRole = (session.user as { globalRole?: string | null })?.globalRole;
    if (userRole !== requiredRole) {
      return null;
    }
  }

  return <>{children}</>;
}
