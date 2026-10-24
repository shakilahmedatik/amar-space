import { getLocale } from "next-intl/server";
import { AdminShell } from "@/components/admin-shell";
import { AuthGuard } from "@/components/auth-guard";

export default async function AdminHomePage() {
  const locale = (await getLocale()) as "en" | "bn";

  return (
    <AuthGuard>
      <AdminShell initialLocale={locale} />
    </AuthGuard>
  );
}
