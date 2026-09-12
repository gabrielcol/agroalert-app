// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

// `src/trpc/server.ts` only needs `createTRPCContext` / `appRouter` to build
// the tRPC proxy `prefetch` reads `queryOptions` from; neither is exercised
// by this test, so stub them out rather than pulling in the whole app router
// (db, auth, weather, the AI client, ...).
vi.mock("@/server/trpc/init", () => ({ createTRPCContext: vi.fn() }));
vi.mock("@/server/trpc/root", () => ({ appRouter: {} }));

// React's `cache()` only memoizes inside an active render. Outside of one
// (as in this test) every call re-runs the wrapped function, so the
// `getQueryClient()` this test calls and the one `prefetch` calls internally
// would otherwise be two different `QueryClient` instances. Replace `cache`
// with a lazy singleton to mirror the per-request memoization a real RSC
// render provides.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => {
      let cached: ReturnType<T>;
      let called = false;
      return ((...args: Parameters<T>) => {
        if (!called) {
          cached = fn(...args) as ReturnType<T>;
          called = true;
        }
        return cached;
      }) as T;
    },
  };
});

const { getQueryClient, prefetch } = await import("@/trpc/server");

describe("prefetch", () => {
  it("returns a promise that resolves once the query is cached with data", async () => {
    const queryKey = ["test", "prefetch"] as const;
    // A minimal stand-in for a `TRPCQueryOptions` result — `prefetch` only
    // reads `queryKey` (to branch infinite vs. regular) and hands the rest
    // straight to `QueryClient#prefetchQuery`.
    const queryOptions = {
      queryKey,
      queryFn: async () => "hello",
    };

    const result = prefetch(
      queryOptions as unknown as Parameters<typeof prefetch>[0],
    );
    expect(result).toBeInstanceOf(Promise);

    await result;

    const queryClient = getQueryClient();
    expect(queryClient.getQueryData(queryKey)).toBe("hello");
  });
});
