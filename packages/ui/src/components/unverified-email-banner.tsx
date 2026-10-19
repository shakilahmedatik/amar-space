"use client";

import { AlertTriangle, CheckCircle2, Loader2, Mail } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";

export interface UnverifiedEmailBannerProps {
  email: string;
  onResend?: () => Promise<void>;
  className?: string;
}

export function UnverifiedEmailBanner({ email, onResend, className }: UnverifiedEmailBannerProps) {
  const [isResending, setIsResending] = React.useState(false);
  const [resendSuccess, setResendSuccess] = React.useState(false);
  const [resendError, setResendError] = React.useState<string | null>(null);

  const handleResend = async () => {
    if (!onResend || isResending) return;
    setIsResending(true);
    setResendError(null);
    try {
      await onResend();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 6000);
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : "Failed to send verification email");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        "w-full bg-[#FAF6F0] dark:bg-[#1E1815] border-b border-[#C5A880]/40 text-[#2A201C] dark:text-[#FBF8F3] px-4 py-2.5 shadow-xs transition-all",
        className,
      )}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="size-6 rounded-full bg-[#C5A880]/20 flex items-center justify-center shrink-0 text-[#9E7D47] dark:text-[#E5C378]">
            <AlertTriangle className="size-3.5" />
          </div>
          <p className="font-medium text-foreground">
            <span>Your email </span>
            <strong className="font-semibold text-foreground underline decoration-[#C5A880]/60 underline-offset-2">
              {email}
            </strong>
            <span> is unverified. Please check your inbox to ensure full security.</span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {resendSuccess ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
              <CheckCircle2 className="size-3.5" />
              Verification link dispatched!
            </span>
          ) : (
            <>
              {resendError && <span className="text-rose-500 font-medium">{resendError}</span>}
              {onResend && (
                <Button
                  variant="goldOutline"
                  size="sm"
                  onClick={handleResend}
                  disabled={isResending}
                  className="h-7 text-xs px-2.5 font-semibold"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="size-3 animate-spin mr-1.5" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="size-3 mr-1.5" />
                      Resend Link
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
