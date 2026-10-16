"use client";

import { Button } from "@omniheaven/ui";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function LanguageToggle({ currentLocale }: { currentLocale: "en" | "bn" }) {
  const router = useRouter();
  const _pathname = usePathname();

  const toggleLanguage = () => {
    const nextLocale = currentLocale === "en" ? "bn" : "en";
    // Set locale cookie for next-intl
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 h-8 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <Globe className="size-3.5 text-indigo-500" />
      <span>{currentLocale === "en" ? "বাংলা" : "English"}</span>
    </Button>
  );
}
