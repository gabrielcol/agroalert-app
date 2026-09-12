# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Project

See [`README.md`](README.md) for the stack, structure and conventions. This repository is a
whitelabel **foundation to fork**: auth + RBAC, an append-only audit log, user management,
system settings, i18n and a typed tRPC/Prisma API. Add your domain on top of it.

# Workflow rules

These rules are mandatory for every task.

## 1. Track everything in the issue tracker

- All work must be reflected in the project's issue tracker: the markdown files under
  [`docs/issues/`](docs/issues/). See [`docs/issues/README.md`](docs/issues/README.md) for
  the naming and frontmatter format.
- **Document the task first**, before writing any code. Create the issue file on `main`
  with a clear description and acceptance criteria, then start work. Creating the issue is
  not task work, so it is the one thing that lands on `main` directly (rule 2).

## 2. One branch per task

- **Every task must be done in its own branch**, created off the up-to-date `main`.
- Never commit task work directly to `main`. One task = one branch = one PR.

## 3. Tests are written per task; the e2e suite gates the deploy

- **Every task must ship tests**: **unit tests** (Vitest) **and** **e2e tests**
  (Playwright) covering the new behavior. Add them alongside the existing setup in
  `test/` and `e2e/`. This has not changed — both are still written per task.
- **Per-task gate, green before the PR:**

  ```bash
  bun run typecheck
  bun run lint
  bunx prettier --check .   # run `bun run format` first if needed
  bun run test              # Vitest
  ```

- **e2e runs before each deploy, not per PR.** This is a prototype/hackathon pace: the
  Playwright suite boots the app and is too slow to sit in front of every PR. Run
  `E2E_PORT=3100 bun run test:e2e` before a deploy and fix the suite then. A PR whose
  Playwright spec has not been run says so in its description.
- **Exemption:** tasks with **no runtime surface** (for example, docs-only or
  comment-only changes) are exempt. A config change that can affect build/runtime
  behavior still requires tests. State the exemption in the PR/changelog.

## 4. Deliver via PR, move to In Review

- When the task is done, create a **pull request** and move the corresponding issue to
  **In Review**. Link the PR to the issue.

## 5. Reviews via CodeRabbit — never auto-merge

- **Do not merge PRs automatically.** Reviews are done with **CodeRabbit**.
- After opening the PR, **check back after ~10 minutes** for CodeRabbit feedback.
  If feedback is present, **implement it**; if not, leave the PR for human review.

## 6. Ask when unclear — no assumptions

- The goal is a **strong app with no assumptions**. **Always ask questions** when anything
  is unclear (requirements, scope, edge cases, design). Do not guess or silently assume.

## 7. Build UI with shadcn — Pro preferred

- **All UI elements must be created with shadcn.** Prefer **shadcn Pro / shadcn Studio**
  components via the MCP server; fall back to **shadcn default** components when a Pro block
  does not fit. Do not hand-roll UI that shadcn already provides.
- See [`shadcn-instructions.md`](shadcn-instructions.md) for the MCP workflow.

## 8. Keep a changelog

- Maintain [`CHANGELOG.md`](CHANGELOG.md) in the repo. Add an entry for **every** item,
  task, bugfix, or modification.
- Each entry must specify the **datetime** and the **branch** it was made on.

## 9. Plan first, then auto

- **Always start in plan mode.** Present a plan and wait for approval.
- **Once the plan is approved, switch to auto** and execute it.

## 10. Parallel multi-agent work: foundation first

When a task is split across **multiple parallel branches/agents**, land the **shared
foundation first**. The foundation is the common substrate everything builds on: the data
model (Prisma schema + migrations), the tRPC router surface / input–output **contracts**,
and shared scaffolding (i18n key namespaces, shared providers, shared test infra).

- **Merge the foundation to `main` before any feature branch starts.** Feature branches are
  then cut from the up-to-date `main` (rule 2) — never stacked on an unmerged base. Stacking
  on an unmerged foundation freezes `main`, lets siblings diverge, and defers the whole
  integration cost to one big-bang merge at the end.
- **Freeze contracts at fan-out.** Do not change a shared tRPC input/output shape on a
  feature branch after siblings build against it; such changes belong to the foundation (or
  a follow-up), not a leaf branch — git won't flag the break, only tests will.
- **Give each parallel branch a disjoint set of files.** Where a file is structurally shared
  (i18n dictionaries, co-owned routers, test config), split it or assign a single owner
  before fan-out so parallel edits don't collide.
- **Integrate continuously.** Merge each feature to `main` as it passes review rather than
  accumulating stacked branches for a big-bang integration.
