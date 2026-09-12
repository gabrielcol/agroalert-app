import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import {
  SettingsEditor,
  type SystemConfigRow,
} from "@/components/admin/config/settings-editor";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n";

/** Narrow a persisted string to a known locale, falling back to the default. */
function toLocale(value: string | null | undefined): Locale {
  return (LOCALES as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : DEFAULT_LOCALE;
}

// System configuration. The singleton is read server-side (RBAC:
// system-config:read); edits go through the guarded tRPC updateSystem
// procedure (system-config:update).
export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const role = (session.user as { role?: string | null }).role;
  if (!hasPermission(role, { "system-config": ["read"] })) {
    redirect("/dashboard");
  }
  const canEdit = hasPermission(role, { "system-config": ["update"] });

  const row = await db.systemConfig.findUnique({ where: { id: "singleton" } });
  const config: SystemConfigRow = {
    defaultLocale: toLocale(row?.defaultLocale),
    siteName: row?.siteName ?? "",
  };

  return <SettingsEditor config={config} canEdit={canEdit} />;
}
