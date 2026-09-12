import "server-only";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/env";

// Prisma 7 requires a driver adapter. SQLite for now — swap the adapter (and the
// datasource provider in prisma/schema.prisma) to move to Postgres. See README.
const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: env.DATABASE_URL }),
  });

// Singleton to avoid exhausting connections during Next.js hot-reload in dev.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

const alreadyInitialized = Boolean(globalForPrisma.prisma);

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// SQLite concurrency for a single-node deployment: WAL lets readers and one
// writer proceed concurrently on the same file, and a busy timeout makes a contended writer wait for
// the lock instead of failing fast with SQLITE_BUSY. Journal mode persists in
// the database file; applied once per fresh client (not on HMR reuse).
if (!alreadyInitialized) {
  void db.$queryRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
  void db.$queryRawUnsafe("PRAGMA busy_timeout=5000;").catch(() => {});
}
