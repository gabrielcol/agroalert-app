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

/** Prefetch a query on the server so it hydrates instantly on the client. */
export function prefetch<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends ReturnType<TRPCQueryOptions<any>>,
>(queryOptions: T) {
  const queryClient = getQueryClient();
  if (queryOptions.queryKey[1]?.type === "infinite") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    void queryClient.prefetchQuery(queryOptions);
  }
}
