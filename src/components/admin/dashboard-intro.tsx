"use client";

import { PageHeader } from "@/components/admin/page-header";
import { useT } from "@/lib/i18n/provider";

/** Localized dashboard heading; the greeting names the signed-in user. */
export function DashboardIntro({ name }: { name: string }) {
  const t = useT();
  const d = t.admin.dashboard;
  return (
    <PageHeader
      title={name ? d.welcome.replace("{name}", name) : t.nav.dashboard}
      description={d.subtitle}
    />
  );
}
