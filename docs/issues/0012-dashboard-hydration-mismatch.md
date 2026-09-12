---
status: In Review
branch: fix/dashboard-hydration-mismatch
created: 2026-09-13
---

# Dashboard hydration mismatch on `post.list`

## Description

Loading `/dashboard` with real data logs a React hydration mismatch in the browser:
server rendered `<p class="text-muted-foreground text-sm">Loading…</p>` inside `PostList`,
client rendered `<ul class="space-y-2">`.

Root cause: `src/app/(admin)/dashboard/page.tsx` calls
`prefetch(trpc.post.list.queryOptions())`, but `prefetch` in `src/trpc/server.ts` does
`void queryClient.prefetchQuery(...)` and returns nothing, so the page never awaits it.
`src/trpc/query-client.ts` dehydrates pending queries
(`shouldDehydrateQuery: default || status === "pending"`), so `HydrateClient` ships a
still-pending query to the client. `src/components/posts/post-list.tsx` uses `useQuery`
with an `isLoading` branch (not `useSuspenseQuery`), so the server renders the "Loading…"
branch while the client, whose streamed promise has already resolved by hydration time,
renders the list — a mismatch.

Fix: make `prefetch` return the prefetch promise instead of voiding it, and `await` it at
every call site whose consuming component branches on `isLoading` with plain `useQuery`.

## Acceptance criteria

- [ ] No hydration error is logged in the browser console when loading `/dashboard` with
      posts present.
- [ ] The server-rendered HTML for `/dashboard` contains the post list (not the "Loading…"
      placeholder) when posts exist.
- [ ] `prefetch` in `src/trpc/server.ts` returns a promise that resolves once the query is
      in the cache.
- [ ] Every other `prefetch(...)` call site whose consumer uses `useQuery` with a
      pending-state branch is awaited too.
