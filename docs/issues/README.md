# Issue tracker

This folder **is** the issue tracker. One markdown file per issue, committed to `main`
before the work starts (AGENTS.md rule 1). Creating the file is the analogue of opening a
ticket — it is not task work, so it lands on `main`, not on the task branch.

## File naming

`NNNN-kebab-slug.md`, where `NNNN` is the next free four-digit number (`0001`, `0002`, …).

## Format

```markdown
---
status: Todo
branch: feat/some-branch
created: 2026-01-31
---

# Title

## Description

What the change is and why.

## Acceptance criteria

- [ ] Checkable, observable statements.
```

## Frontmatter

| Field     | Values                                        |
| --------- | --------------------------------------------- |
| `status`  | `Todo` → `In Progress` → `In Review` → `Done` |
| `branch`  | The branch the work is done on                |
| `created` | `YYYY-MM-DD`                                  |

Move the issue along by editing the `status` line only — a one-line change keeps the file
conflict-free when the branch and `main` both touch it.
