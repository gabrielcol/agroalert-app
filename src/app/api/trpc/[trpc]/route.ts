import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTRPCContext } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/root";

/**
 * Log the cause chain of every failed call. The routers map domain failures to
 * short codes (`WEATHER_UNAVAILABLE`, `AI_UNAVAILABLE`, …) and keep the real
 * error as `cause`; without this the operator only ever sees the code.
 */
function causeDetail(
  cause: unknown,
  depth = 0,
): Record<string, unknown> | undefined {
  if (!(cause instanceof Error)) return undefined;
  const { endpoint, status } = cause as Error & {
    endpoint?: unknown;
    status?: unknown;
  };
  const inner = depth < 3 ? causeDetail(cause.cause, depth + 1) : undefined;
  return {
    name: cause.name,
    message: cause.message,
    ...(endpoint === undefined ? {} : { endpoint }),
    ...(status === undefined ? {} : { status }),
    ...(inner === undefined ? {} : { cause: inner }),
  };
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError: ({ path, error }) => {
      console.error("tRPC error", {
        path: path ?? "<no path>",
        code: error.code,
        message: error.message,
        cause: causeDetail(error.cause),
      });
    },
  });

export { handler as GET, handler as POST };
