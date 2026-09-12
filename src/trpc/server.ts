import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  createTRPCOptionsProxy,
  type TRPCQueryOptions,
} from "@trpc/tanstack-react-query";
import { cache } from "react";
import { createElement, type ReactNode } from "react";

import { createTRPCContext } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/root";
import { makeQueryClient } from "@/trpc/query-client";

// One QueryClient per request (RSC render).
export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy({
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});

export function HydrateClient(props: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return createElement(
    HydrationBoundary,
    { state: dehydrate(queryClient) },
    props.children,
  );
}

/**
 * Prefetch a query on the server so it hydrates instantly on the client.
 *
 * Returns the underlying prefetch promise. Callers that SSR a consuming
 * client component with a non-suspense `useQuery` (one that renders a
 * different branch while `isLoading`) must `await` this call — otherwise
 * `HydrateClient` dehydrates the query while it is still pending (see
 * `query-client.ts`'s `shouldDehydrateQuery`), the server renders the
 * pending branch, and the client — whose streamed promise has since
 * resolved — renders the resolved branch, causing a hydration mismatch.
 * Callers whose consumer uses `useSuspenseQuery` may leave this un-awaited.
 */
export function prefetch<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends ReturnType<TRPCQueryOptions<any>>,
>(queryOptions: T): Promise<void> {
  const queryClient = getQueryClient();
  if (queryOptions.queryKey[1]?.type === "infinite") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    return queryClient.prefetchQuery(queryOptions);
  }
}
