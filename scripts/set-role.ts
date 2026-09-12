/**
 * Bootstrap / ops helper: assign an app role to a user by email.
 *
 *   bun run set-role <email> <role>
 *   bun run set-role alice@example.com admin
 *
 * Roles: admin | member | auditor
 * (see src/lib/permissions.ts).
 *
 * Uses Bun's built-in SQLite (no native addon) so it runs under `bun run`.
 * Excluded from `tsc` (see tsconfig "exclude").
 */
import { Database } from "bun:sqlite";

import { ROLE_NAMES, isAppRole } from "../src/lib/permissions";

const [email, role] = process.argv.slice(2);

if (!email || !role) {
  console.error("Usage: bun run set-role <email> <role>");
  console.error(`Roles: ${ROLE_NAMES.join(" | ")}`);
  process.exit(1);
}
if (!isAppRole(role)) {
  console.error(`Invalid role "${role}". Use one of: ${ROLE_NAMES.join(", ")}`);
  process.exit(1);
}

// Bun auto-loads .env, so DATABASE_URL is set. Strip the file: prefix.
const url = process.env.DATABASE_URL ?? "file:./dev.db";
const path = url.replace(/^file:/, "");

const db = new Database(path);
db.exec("PRAGMA busy_timeout = 5000");

const user = db
  .query("SELECT id, role FROM user WHERE email = ?")
  .get(email) as { id: string; role: string } | null;

if (!user) {
  console.error(`No user found with email "${email}".`);
  process.exit(1);
}

db.query("UPDATE user SET role = ? WHERE id = ?").run(role, user.id);

// This is a privileged, out-of-band role change — record it in the
// append-only audit trail with an ops actor marker so it stays traceable.
db.query(
  `INSERT INTO audit_log (id, actorId, actorRole, action, resourceType, resourceId, metadata)
   VALUES (?, NULL, 'ops', 'user.set_role', 'users', ?, ?)`,
).run(
  crypto.randomUUID(),
  user.id,
  JSON.stringify({ from: user.role, to: role, via: "set-role script" }),
);

console.log(`✔ ${email} is now "${role}"`);
