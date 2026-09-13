---
status: In Review
branch: fix/start-screen-once-per-session
created: 2026-09-13
---

# Start screen shows once per browser session

## Description

The AgroPlan splash (`StartScreen`, issue 0014) replays on **every** mount of `/`:
`HomeScreen` keeps the handover in `useState`, so a reload, a client navigation back to
`/`, or returning from `/plan/*` puts the ~2.25s splash in front of the dashboard again.
It is a welcome beat, not a loading screen — seeing it repeatedly is friction.

Decision: show it **once per browser session**, remembered in `sessionStorage` under
`agro.startScreenSeen`. The first visit to `/` in a tab session plays the splash; every
later visit in the same session goes straight to "Culturile tale". A new tab or a closed
browser drops the flag and the splash plays again. Behaviour is identical whether or not
the user is signed in — the flag is per browser session, not per account.

The server render and the first client render must still agree (no hydration mismatch):
the server has no `sessionStorage`, so it renders the "not seen" branch and the client
corrects it synchronously during hydration.

## Acceptance criteria

- [ ] First visit to `/` in a browser session renders the start screen, then the dashboard.
- [ ] A later visit to `/` in the same session (reload, client nav, return from `/plan/*`)
      renders the dashboard immediately and never mounts the start screen.
- [ ] A fresh browser session (new tab / closed browser) shows the splash again.
- [ ] The flag is written when the splash hands over, and reading/writing it is safe when
      `window` or `sessionStorage` is unavailable (SSR, storage disabled).
- [ ] No hydration mismatch on `/`.
- [ ] Unit tests cover first visit, flag-already-set and flag-written-on-handover; the
      Playwright spec covers the second visit in the same context.
