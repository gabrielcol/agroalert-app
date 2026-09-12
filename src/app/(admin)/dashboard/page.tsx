import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { PostList } from "@/components/posts/post-list";
import { DashboardIntro } from "@/components/admin/dashboard-intro";

// Signed-in landing page. The (admin) layout already guards the session; this
// page prefetches the demo `post.list` query on the server and hydrates it.
export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  await prefetch(trpc.post.list.queryOptions());

  return (
    <HydrateClient>
      <div className="space-y-6">
        <DashboardIntro name={session?.user.name ?? ""} />
        <PostList />
      </div>
    </HydrateClient>
  );
}
