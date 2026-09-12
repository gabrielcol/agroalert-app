/**
 * Seed data + idempotent seeding logic. The seeding logic is exported
 * separately from the Prisma-client wiring in `prisma/seed.ts` so it can be
 * unit-tested against a fake client. All writes are `upsert`s keyed on stable
 * ids → running the seed repeatedly is a no-op.
 */
import type { PrismaClient } from "@/generated/prisma/client";

/** Singleton system configuration (id = "singleton"). */
export const SEED_SYSTEM_CONFIG = {
  id: "singleton",
  defaultLocale: "en",
  siteName: "",
} as const;

/** Seed the database. Idempotent — safe to run repeatedly. */
export async function seedDatabase(db: PrismaClient): Promise<void> {
  const { id, ...data } = SEED_SYSTEM_CONFIG;
  await db.systemConfig.upsert({
    where: { id },
    create: { id, ...data },
    update: {},
  });
}
