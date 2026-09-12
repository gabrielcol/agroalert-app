import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { AuditLogTable } from "@/components/admin/audit-log-table";

// Append-only audit log viewer — Admin and Auditor (`audit-log:read`). Renders
// inside the (admin) sidebar layout; RBAC is enforced server-side.
export default async function AuditPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const role = (session.user as { role?: string | null }).role;
  if (!hasPermission(role, { "audit-log": ["read"] })) redirect("/dashboard");

  await prefetch(trpc.audit.list.queryOptions({ limit: 50 }));

  return (
    <HydrateClient>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Audit log</h1>
          <p className="text-muted-foreground text-sm">
            Append-only record of all actions.
          </p>
        </div>
        <AuditLogTable />
      </div>
    </HydrateClient>
  );
}
