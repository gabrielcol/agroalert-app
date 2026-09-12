---
status: In Review
branch: fix/admin-topbar-hydration-mismatch
created: 2026-09-13
---

# Admin topbar hydration mismatch

## Description

Every page under `src/app/(admin)/` logs a React hydration mismatch: server rendered
text didn't match the client, `+ AC` / `- ?` inside `AvatarFallback` in `AdminTopbar`
(`src/components/admin/admin-topbar.tsx`), rendered by `src/app/(admin)/layout.tsx`.

Root cause: `AdminTopbar` gets the signed-in user from `authClient.useSession()`, which
is client-only and has no data during SSR, so `initials(undefined)` renders `"?"` on the
server (regardless of who is actually signed in) while the client, once its own session
fetch resolves, renders the real initials — and the dropdown label renders `"…"` vs the
real name. React then regenerates the tree on the client to reconcile.

Whether this actually throws (an `Uncaught Error: Hydration failed...`, confirmed
reproducible) depends on a genuine timing race — whether `authClient.useSession()`'s
fetch resolves before or after hydration commits — which in turn depends on how much JS
the route has to parse before hydrating. It reproduces reliably on the heavier `/users`
route (confirmed via `e2e/users.spec.ts`, 2/2 runs): the "Add user" click lands mid tree
regeneration and is lost, so `getByRole('dialog').getByLabel('Name')` times out. It does
not reliably reproduce on the lighter `/dashboard` bundle even though the same bug is
present there — the race is just less likely to be lost. Either way, the server-rendered
HTML for any admin page never reflects the real signed-in user, which is a bug in its own
right regardless of whether hydration happens to fail loudly on a given route weight.

Fix: `src/app/(admin)/layout.tsx` already awaits `auth.api.getSession(...)`. Thread that
server-known user down as a plain, serialisable `initialUser` prop to `AdminTopbar`, and
have the component derive `user = session?.user ?? initialUser` (keeping
`authClient.useSession()` for live updates after sign-out or a name change). Server and
first client render then produce identical text — no more mismatch.

## Acceptance criteria

- [x] The server-rendered HTML for an admin page (e.g. `/dashboard`) contains the
      signed-in user's real initials in the topbar avatar fallback, not `"?"`.
- [x] `AdminTopbar` accepts a server-provided `initialUser` and falls back to it only
      until `authClient.useSession()` has data, so it keeps updating live afterward
      (sign-out, a name change).
- [x] No other SSR-rendered `authClient.useSession()` call site in `src` has the same
      pattern (grepped and confirmed `AdminTopbar` is the only one).
- [x] `e2e/dashboard.spec.ts`'s hydration check is deterministic (checks the raw SSR
      HTML directly) rather than depending on the timing race described above.
