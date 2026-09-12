import "server-only";

import { db as singletonDb } from "@/lib/db";

/**
 * Append-only audit trail. Writes only — rows are
 * never updated or deleted through the app. `metadata` is JSON-serialized.
 */
export interface AuditEntry {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
}

/** A single field's before/after values, as recorded in an audit entry. */
export type FieldChange = { from: unknown; to: unknown };

/** Field-level before/after diff, keyed by field name. */
export type ChangeSet = Record<string, FieldChange>;

// Audit metadata is JSON-serialized and must stay compact, so long string
// values (e.g. rich-text bodies) are capped. Comparison still runs on the full
// value, so a change past the cap is still detected — only the stored copy is
// truncated.
const MAX_AUDIT_VALUE_LENGTH = 500;

function toComparable(value: unknown): unknown {
  return value instanceof Date ? value.toISOString() : value;
}

function capValue(value: unknown): unknown {
  if (typeof value === "string" && value.length > MAX_AUDIT_VALUE_LENGTH) {
    return `${value.slice(0, MAX_AUDIT_VALUE_LENGTH)}…`;
  }
  return value;
}

/**
 * Build a field-level before/after diff for an audit entry — so the
 * trail records *what changed*, not just which resource was altered. Only keys
 * present in `after` are considered, and a key is recorded only when its value
 * actually changed. Dates are normalized to ISO strings; long strings are
 * capped so the serialized metadata stays bounded. Intended for shallow, scalar
 * record fields.
 */
export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): ChangeSet {
  const changes: ChangeSet = {};
  for (const key of Object.keys(after)) {
    const from = toComparable(before[key]);
    const to = toComparable(after[key]);
    if (from !== to) {
      changes[key] = { from: capValue(from), to: capValue(to) };
    }
  }
  return changes;
}

// Exact row shape written to the audit table. Kept in sync with the Prisma
// `AuditLog` model so both the real client and test fakes satisfy `AuditDb`.
type AuditLogCreateData = {
  actorId: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: string | null;
};

// The one method audit writing needs — lets tests pass a fake client.
type AuditDb = {
  auditLog: { create: (args: { data: AuditLogCreateData }) => unknown };
};

/**
 * Persist one audit entry. **Errors propagate** — the caller chooses the policy:
 * state-changing operations pass a transaction client so a failed audit rolls
 * back the whole operation (fail-closed, preserving the immutable trail), while
 * auth-event logging wraps this in best-effort handling (see recordAuthEvent).
 */
export async function writeAuditLog(
  client: AuditDb,
  entry: AuditEntry,
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      actorRole: entry.actorRole ?? null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      metadata:
        entry.metadata === undefined ? null : JSON.stringify(entry.metadata),
    },
  });
}

/** Shape of the session passed to the better-auth `session.create` hook. */
type SessionLike = {
  id?: string;
  userId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  impersonatedBy?: string | null;
};

/**
 * Record an auth event (e.g. sign-in) from a better-auth database hook. Uses
 * the singleton db since it runs outside the tRPC request context.
 */
export async function recordAuthEvent(
  action: string,
  session: SessionLike,
): Promise<void> {
  // Best-effort: this is awaited from the better-auth session.create hook, so a
  // DB hiccup here must never reject the hook and block sign-in.
  try {
    const actorId = session.userId ?? null;
    let actorRole: string | null = null;
    if (actorId) {
      const user = await singletonDb.user.findUnique({
        where: { id: actorId },
        select: { role: true },
      });
      actorRole = user?.role ?? null;
    }

    await writeAuditLog(singletonDb, {
      actorId,
      actorRole,
      action,
      resourceType: "auth",
      resourceId: actorId,
      ipAddress: session.ipAddress ?? null,
      userAgent: session.userAgent ?? null,
      metadata: {
        sessionId: session.id ?? null,
        impersonatedBy: session.impersonatedBy ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record auth event", err);
  }
}
