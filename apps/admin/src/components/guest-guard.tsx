"use client";

import { useSession } from "@omniheaven/auth/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

interface GuestGuardProps {
  children: ReactNode;
  fallbackUrl?: string;
}

export function GuestGuard({ children, fallbackUrl = "/" }: GuestGuardProps) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session) {
      const searchParams = new URLSearchParams(window.location.search);
      const callbackUrl = searchParams.get("callbackUrl") || fallbackUrl;
      router.replace(callbackUrl);
    }
  }, [session, isPending, router, fallbackUrl]);

  if (isPending || session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--canvas))] text-[hsl(var(--foreground))]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
