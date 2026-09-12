/**
 * Create a user with a password + role. Run with:
 *
 *   bun run create-user <email> <password> [role] [name]
 *
 * Public self-service sign-up is disabled (see `src/lib/auth.ts`), so accounts
 * are provisioned by an admin. In the app this is the users UI
 * (`admin.createUser`); this script is the equivalent for bootstrapping the
 * first admin and for e2e seeding — it hashes the password with better-auth's
 * own hasher so the account signs in normally.
 *
 * Uses Bun's built-in SQLite with `PRAGMA busy_timeout` (mirroring
 * `scripts/set-role.ts`) so it stays reliable when many instances run in
 * parallel against the shared dev DB during e2e. Writes the `user` row and its
 * better-auth credential `account` row in one transaction.
 */
import { randomUUID } from "node:crypto";

import { Database } from "bun:sqlite";
import { hashPassword } from "better-auth/crypto";

import { ROLE_NAMES, SIGNUP_ROLE, isAppRole } from "../src/lib/permissions";

const [email, password, roleArg, nameArg] = process.argv.slice(2);
if (!email || !password) {
  console.error(
    "Usage: bun run create-user <email> <password> [role] [name]\n" +
      `  role: one of ${ROLE_NAMES.join(", ")} (default "${SIGNUP_ROLE}")`,
  );
  process.exit(1);
}

// Mirror the admin create-user password policy (better-auth default 8–128) so
// this bootstrap path can't provision a weaker password than the UI allows.
if (password.length < 8 || password.length > 128) {
  console.error("Password must be between 8 and 128 characters.");
  process.exit(1);
}

const role = roleArg ?? SIGNUP_ROLE;
// Allow the non-functional sign-up sentinel or any real role.
if (role !== SIGNUP_ROLE && !isAppRole(role)) {
  console.error(
    `Invalid role "${role}". Expected one of: ${ROLE_NAMES.join(", ")}, ${SIGNUP_ROLE}`,
  );
  process.exit(1);
}

const path = (process.env.DATABASE_URL ?? "file:./dev.db").replace(
  /^file:/,
  "",
);
const db = new Database(path);
db.exec("PRAGMA busy_timeout = 5000");

const existing = db.query("SELECT id FROM user WHERE email = ?").get(email);
if (existing) {
  console.error(`User already exists: ${email}`);
  process.exit(1);
}

// hashPassword is async (scrypt); do it before opening the sync transaction.
const passwordHash = await hashPassword(password);
const userId = randomUUID();
const name = nameArg ?? email.split("@")[0];

const insert = db.transaction(() => {
  db.query(
    `INSERT INTO user (id, name, email, emailVerified, role, updatedAt)
     VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
    // Admin-provisioned accounts are trusted (the admin typed the address), so
    // mark them verified.
  ).run(userId, name, email, role);
  db.query(
    // better-auth's email/password credential lives in an `account` row with
    // providerId "credential"; accountId mirrors the user id.
    `INSERT INTO account (id, accountId, providerId, userId, password, updatedAt)
     VALUES (?, ?, 'credential', ?, ?, CURRENT_TIMESTAMP)`,
  ).run(randomUUID(), userId, userId, passwordHash);
});
insert();

console.log(`✔ Created user ${email} (role: ${role}, id: ${userId})`);
