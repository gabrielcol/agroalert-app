import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Application resources → actions. **Single source of truth** — used both to
 * build the full `statement` and to grant the Admin role every app action, so
 * adding a resource here can't leave Admin under-provisioned.
 */
const appStatement = {
  "audit-log": ["read"],
  "system-config": ["read", "update"],
} as const;

/**
 * Full resource/action statement. `defaultStatements` contributes the
 * better-auth admin plugin's own `user` / `session` management actions;
 * `appStatement` contributes the application resources.
 */
export const statement = {
  ...defaultStatements,
  ...appStatement,
} as const;

export const ac = createAccessControl(statement);

/**
 * Roles. Role keys are the strings stored in `User.role`. `admin` gets every
 * app action (via `appStatement`) plus the admin plugin's user/session
 * management permissions (via `adminAc.statements`).
 */
export const admin = ac.newRole({
  ...adminAc.statements,
  ...appStatement,
});

/** Regular signed-in user: no admin-area capabilities beyond their own data. */
export const member = ac.newRole({
  "system-config": ["read"],
});

/** Read-only oversight: can read the audit trail and the system config. */
export const auditor = ac.newRole({
  "audit-log": ["read"],
  "system-config": ["read"],
});

/** Role registry passed to the better-auth admin plugin and the client. */
export const roles = { admin, member, auditor };

export type AppRole = keyof typeof roles;

export const ROLE_NAMES = Object.keys(roles) as AppRole[];

/**
 * Role assigned to newly registered users. Deliberately NOT one of the
 * functional roles: a self-registered account has **no permissions** until an
 * admin assigns a role from the users screen. Sensitive reads (e.g. the audit
 * log, granted to `auditor`) must never be handed out by open sign-up.
 */
export const SIGNUP_ROLE = "pending";

export function isAppRole(value: string | null | undefined): value is AppRole {
  return !!value && Object.prototype.hasOwnProperty.call(roles, value);
}

/** A permission request: resource → required actions (all must be granted). */
export type PermissionRequest = Partial<
  Record<keyof typeof statement, string[]>
>;

/**
 * Whether the given stored role (better-auth allows a comma-separated list)
 * grants every requested action. Unknown / empty / non-functional roles (e.g.
 * the `pending` sign-up role) grant nothing — access is default-deny.
 */
export function hasPermission(
  role: string | null | undefined,
  request: PermissionRequest,
): boolean {
  const roleNames = (role ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  return roleNames.some((name) => {
    if (!isAppRole(name)) return false;
    // `request` is a loosely-typed subset; the role statements are exact.
    return roles[name].authorize(request as never).success;
  });
}

/**
 * Whether a role may open the admin area at all — either to manage users or to
 * read the audit log. Section-level access is then checked per capability.
 */
export function canAccessAdminArea(role: string | null | undefined): boolean {
  return (
    hasPermission(role, { user: ["list"] }) ||
    hasPermission(role, { "audit-log": ["read"] })
  );
}
