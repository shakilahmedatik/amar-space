"use client";

import { Badge, Button, Card, Input } from "@omniheaven/ui";
import { ArrowRight, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setPortalSession } from "../lib/portal-session";
import { trpc } from "../lib/trpc";

export default function RenterPortalHomePage() {
  const router = useRouter();
  const [flatNumber, setFlatNumber] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");

  const authenticate = trpc.billing.portalAuthenticate.useMutation({
    onSuccess: (session) => {
      setPortalSession(session.token, session.flatNumber);
      router.push(`/flat-${encodeURIComponent(session.flatNumber.toLowerCase())}`);
    },
    onError: (err) => {
      setError(err.message || "Invalid flat number or access code.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!flatNumber.trim() || !accessCode.trim()) {
      setError("Please enter both your flat number and access code.");
      return;
    }

    authenticate.mutate({
      flatSlug: flatNumber.trim(),
      accessCode: accessCode.trim(),
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-canvas relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex size-14 rounded-2xl bg-gradient-to-br from-primary to-[#8C6D3F] text-primary-foreground items-center justify-center font-serif font-black text-2xl shadow-xl shadow-primary/20 border border-border-gold/40 mb-2">
            Ω
          </div>
          <h1 className="text-2xl font-serif font-black tracking-tight text-foreground">
            OmniHeaven Resident Folio
          </h1>
          <p className="text-sm text-foreground-muted max-w-sm mx-auto">
            Enter your flat number and the access code provided by your residence manager to open
            your self-service concierge & billing hub.
          </p>
        </div>

        <Card className="p-7 border border-border-gold/40 shadow-2xl bg-card rounded-2xl text-foreground">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="flat-number"
                className="text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider"
              >
                Flat / Unit Number
              </label>
              <Input
                id="flat-number"
                type="text"
                autoComplete="off"
                placeholder="e.g. 1A or Suite-201"
                value={flatNumber}
                onChange={(e) => {
                  setFlatNumber(e.target.value);
                  setError("");
                }}
                className="text-sm bg-surface border-border-gold/40 text-foreground placeholder:text-foreground-muted focus:border-primary focus:ring-primary/20"
                disabled={authenticate.isPending}
              />
            </div>

            <div>
              <label
                htmlFor="access-code"
                className="text-xs font-bold text-foreground block mb-1.5 uppercase tracking-wider"
              >
                Resident Access Code
              </label>
              <div className="relative">
                <KeyRound className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                <Input
                  id="access-code"
                  type="password"
                  autoComplete="off"
                  placeholder="Provided by your property manager"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    setError("");
                  }}
                  className="pl-9 text-sm bg-surface border-border-gold/40 text-foreground placeholder:text-foreground-muted focus:border-primary focus:ring-primary/20"
                  disabled={authenticate.isPending}
                />
              </div>
              {error && <p className="text-xs text-rose-500 mt-1.5">{error}</p>}
            </div>

            <Button
              type="submit"
              variant="luxury"
              disabled={authenticate.isPending}
              className="w-full font-semibold flex items-center justify-center gap-2 py-3 shadow-lg shadow-primary/10"
            >
              {authenticate.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verifying Access...
                </>
              ) : (
                <>
                  Access Resident Folio
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border-gold/30 text-center space-y-2">
            <Badge
              variant="outline"
              className="text-[11px] text-foreground-muted font-medium border-border-gold/30 bg-primary/5"
            >
              <ShieldCheck className="size-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />{" "}
              Secure 256-Bit Encrypted Folio
            </Badge>
            <p className="text-xs text-foreground-muted">
              Need access? Contact your residence manager or concierge desk for your flat access
              code.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
