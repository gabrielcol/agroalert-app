"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

import { ac, roles } from "@/lib/permissions";

export const authClient = createAuthClient({
  // Same-origin by default; set only when the auth server is on another origin.
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  // Mirror the server RBAC config so client permission checks + admin APIs work.
  plugins: [adminClient({ ac, roles })],
});

export const { signIn, signUp, signOut, useSession } = authClient;
