import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { UserRoleTable } from "@/components/admin/user-role-table";

// User & role management — Admin only (`user:list`). Renders inside the (admin)
// sidebar layout; RBAC is enforced server-side here and in the tRPC procedures.
export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const role = (session.user as { role?: string | null }).role;
  if (!hasPermission(role, { user: ["list"] })) redirect("/dashboard");

  prefetch(trpc.admin.listUsers.queryOptions());

  return (
    <HydrateClient>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Users &amp; roles</h1>
          <p className="text-muted-foreground text-sm">
            Assign roles and manage access.
          </p>
        </div>
        <UserRoleTable currentUserId={session.user.id} />
      </div>
    </HydrateClient>
  );
}
