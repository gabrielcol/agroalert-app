import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins/admin";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import { env } from "@/env";
import { ac, roles, SIGNUP_ROLE } from "@/lib/permissions";
import { recordAuthEvent } from "@/lib/audit";

const githubConfigured = env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET;

const adminUserIds =
  env.ADMIN_USER_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    // Public self-service sign-up is disabled: accounts are provisioned by an
    // admin (users UI → `admin.createUser`, or the `create-user` bootstrap
    // script), never by open registration. Closing sign-up removes the "promote-by-email" hijack
    // (an attacker can't pre-register someone else's address) and the
    // account-enumeration / unbounded-`pending`-row surface.
    disableSignUp: true,
  },
  // Rate limiting is ALWAYS enabled so brute-force protection never silently
  // depends on NODE_ENV — better-auth only auto-enables it in
  // production, and env.ts defaults NODE_ENV to "development". The per-IP
  // threshold is strict in production and relaxed outside it (so parallel dev/
  // e2e sign-ins from one host aren't throttled); the protection itself is on in
  // every environment.
  //
  // `Secure` cookies are deliberately NOT forced so local/LAN deployments over
  // plain HTTP keep working (browsers drop Secure cookies over http). Pin
  // NODE_ENV=production and front the app with HTTPS in real deployments.
  rateLimit: {
    enabled: true,
    window: 60,
    // Per-IP budget across auth endpoints: strict enough in production to slow
    // brute-force (100 requests/min/IP still leaves headroom for legitimate
    // session polling), effectively unlimited outside it so parallel dev/e2e
    // traffic from a single host isn't throttled.
    max: env.NODE_ENV === "production" ? 100 : 100_000,
    // better-auth ships a stricter built-in rule for `/sign-in/email` (3 per
    // 10 s per IP). Keep it in production; relax it elsewhere so parallel e2e
    // workers signing in from one host aren't throttled.
    ...(env.NODE_ENV === "production"
      ? {}
      : { customRules: { "/sign-in/email": { window: 10, max: 100_000 } } }),
  },
  socialProviders: githubConfigured
    ? {
        github: {
          clientId: env.GITHUB_CLIENT_ID!,
          clientSecret: env.GITHUB_CLIENT_SECRET!,
        },
      }
    : undefined,
  // Append-only audit trail: log each new session. Admin impersonation sessions
  // carry `impersonatedBy`, so record them as a distinct, privileged event
  // rather than blurring them with ordinary sign-ins.
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          const impersonated = (session as { impersonatedBy?: string | null })
            .impersonatedBy;
          await recordAuthEvent(
            impersonated ? "auth.impersonate_start" : "auth.sign_in",
            session,
          );
        },
      },
    },
  },
  plugins: [
    // RBAC + user management. Roles/permissions come from
    // src/lib/permissions.ts; `adminUserIds` bootstraps admins before any role
    // has been assigned in the DB.
    admin({
      ac,
      roles,
      defaultRole: SIGNUP_ROLE,
      adminRoles: ["admin"],
      adminUserIds,
    }),
    // nextCookies() must be the LAST plugin — it lets sign-in/out set cookies
    // from server actions and route handlers.
    nextCookies(),
  ],
});
