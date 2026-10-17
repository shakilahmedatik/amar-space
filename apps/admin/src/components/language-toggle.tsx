"use client";

import { Button } from "@omniheaven/ui";
import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";

export function LanguageToggle({ currentLocale }: { currentLocale: "en" | "bn" }) {
  const router = useRouter();

  const toggleLanguage = () => {
    const nextLocale = currentLocale === "en" ? "bn" : "en";
    // biome-ignore lint/suspicious/noDocumentCookie: Required for next-intl client cookie sync
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 h-8 rounded-full border border-border/70 hover:border-border-gold/60 text-foreground"
    >
      <Globe className="size-3.5 text-primary" />
      <span>{currentLocale === "en" ? "বাংলা" : "English"}</span>
    </Button>
  );
}
