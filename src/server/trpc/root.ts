import { createCallerFactory, createTRPCRouter } from "@/server/trpc/init";
import { postRouter } from "@/server/trpc/routers/post";
import { adminRouter } from "@/server/trpc/routers/admin";
import { auditRouter } from "@/server/trpc/routers/audit";
import { configRouter } from "@/server/trpc/routers/config";
import { fieldProfileRouter } from "@/server/trpc/routers/field-profile";
import { geocodeRouter } from "@/server/trpc/routers/geocode";
import { recommendationRouter } from "@/server/trpc/routers/recommendation";
import { weatherRouter } from "@/server/trpc/routers/weather";

export const appRouter = createTRPCRouter({
  post: postRouter,
  admin: adminRouter,
  audit: auditRouter,
  config: configRouter,
  // AgroAlert (issue 0003 foundation; bodies land in 0004-0006)
  fieldProfile: fieldProfileRouter,
  geocode: geocodeRouter,
  weather: weatherRouter,
  recommendation: recommendationRouter,
});

export type AppRouter = typeof appRouter;

/** Server-side caller factory (used in tests and RSC direct calls). */
export const createCaller = createCallerFactory(appRouter);
