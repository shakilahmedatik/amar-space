"use client";

import { Badge, Button, Card, Input } from "@omniheaven/ui";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RenterPortalHomePage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setError("Please enter your flat access code or phone number");
      return;
    }
    // Route to demo flat portal
    router.push("/flat-4a");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex size-12 rounded-xl bg-indigo-600 text-white items-center justify-center font-bold text-xl shadow-lg mb-2">
            Ω
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Omni Heaven Renter Portal
          </h1>
          <p className="text-sm text-slate-500">
            Enter your flat access code to manage your lease, bills, and maintenance.
          </p>
        </div>

        <Card className="p-6 border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="access-code"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5"
              >
                Flat Access Code or Phone Number
              </label>
              <div className="relative">
                <KeyRound className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="access-code"
                  type="text"
                  placeholder="e.g. FLAT-4A-9821 or 017..."
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    setError("");
                  }}
                  className="pl-9 text-sm"
                />
              </div>
              {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2"
            >
              Access My Flat Portal
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
            <Badge variant="outline" className="text-[11px] text-slate-500 font-normal">
              <ShieldCheck className="size-3 mr-1 text-emerald-500" /> Secure 256-Bit Encrypted
              Portal
            </Badge>
            <p className="text-xs text-slate-400">
              Need access? Contact your building manager or caretaker for your flat code.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
