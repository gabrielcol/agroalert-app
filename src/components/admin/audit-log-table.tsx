"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** One field's before/after values, as stored by the audit diff. */
type FieldChange = { from: unknown; to: unknown };

/**
 * Extract the field-level changes an entry recorded, if any. Metadata is a
 * JSON string (SQLite has no JSON type); parse defensively — a malformed or
 * change-less entry simply renders no diff.
 */
function parseChanges(metadata: unknown): Record<string, FieldChange> | null {
  if (typeof metadata !== "string") return null;
  try {
    const parsed = JSON.parse(metadata) as { changes?: unknown };
    const changes = parsed?.changes;
    if (!changes || typeof changes !== "object") return null;
    return changes as Record<string, FieldChange>;
  } catch {
    return null;
  }
}

/** Render a stored audit value compactly (empty/blank shown as an em dash). */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function AuditLogTable() {
  const trpc = useTRPC();
  const log = useQuery(trpc.audit.list.queryOptions({ limit: 50 }));

  if (log.isLoading) {
    return <p className="text-muted-foreground text-sm">Loading audit log…</p>;
  }

  if (!log.data || log.data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No audit entries yet.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-44">When</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Resource</TableHead>
          <TableHead>Changes</TableHead>
          <TableHead>IP</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {log.data.map((entry) => {
          const changes = parseChanges(entry.metadata);
          const changed = changes ? Object.entries(changes) : [];
          return (
            <TableRow key={entry.id}>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {entry.createdAt.toLocaleString()}
              </TableCell>
              <TableCell>
                {entry.actor?.email ?? entry.actorId ?? "—"}
                {entry.actorRole ? (
                  <span className="text-muted-foreground">
                    {" "}
                    ({entry.actorRole})
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {entry.action}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {entry.resourceType}
                {entry.resourceId ? `:${entry.resourceId.slice(0, 8)}` : ""}
              </TableCell>
              <TableCell className="text-xs">
                {changed.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <ul className="space-y-0.5">
                    {changed.map(([field, change]) => (
                      <li key={field} className="whitespace-nowrap">
                        <span className="font-medium">{field}</span>:{" "}
                        <span className="text-muted-foreground line-through">
                          {formatValue(change?.from)}
                        </span>{" "}
                        <span aria-hidden>→</span>{" "}
                        <span>{formatValue(change?.to)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {entry.ipAddress ?? "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
