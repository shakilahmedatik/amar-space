import { getLocale } from "next-intl/server";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminHomePage() {
  const locale = (await getLocale()) as "en" | "bn";

  return <AdminShell initialLocale={locale} />;
}
