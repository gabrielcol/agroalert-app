import { createCallerFactory, createTRPCRouter } from "@/server/trpc/init";
import { postRouter } from "@/server/trpc/routers/post";
import { adminRouter } from "@/server/trpc/routers/admin";
import { auditRouter } from "@/server/trpc/routers/audit";
import { configRouter } from "@/server/trpc/routers/config";

export const appRouter = createTRPCRouter({
  post: postRouter,
  admin: adminRouter,
  audit: auditRouter,
  config: configRouter,
});

export type AppRouter = typeof appRouter;

/** Server-side caller factory (used in tests and RSC direct calls). */
export const createCaller = createCallerFactory(appRouter);
