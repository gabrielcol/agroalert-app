/**
 * Database seed entry point. Run with `bun run db:seed`.
 *
 * Wires a real Prisma client to the idempotent `seedDatabase` logic in
 * `prisma/seed-data.ts`. Safe to run repeatedly (all writes are upserts).
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "../src/generated/prisma/client";
import { seedDatabase } from "./seed-data";

async function main() {
  // Runs under tsx/node (native better-sqlite3 needs node, not bun), which does
  // not auto-load `.env` — load it if DATABASE_URL isn't already in the env.
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile();
    } catch {
      // No .env file — fall through to the explicit check below.
    }
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  try {
    await seedDatabase(db);
    console.log("✔ Seed complete: system config singleton.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
