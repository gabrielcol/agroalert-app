---
status: Done
branch: fix/variety-loading-state
created: 2026-09-13
---

# Loading state for the Variety Recommendation call

## Description

The wizard makes two model calls. The crops call (step 1 → 2) is covered: the
teren screen swaps to `LoadingScreen`, a spinner with the copy "Pregătim
recomandarea" and a per-call step line, so the wait is explained.

The varieties call (step 2 → 3) is not. Landing on `/plan/soi` fires
`recommendation.varieties`, which takes ~17–20 s against Anthropic, and the
screen shows only three bare grey `RecommendationSkeleton` cards — no spinner,
no words. On a slow call the farmer reads the empty grey boxes as a broken
screen.

Give the varieties step the same treatment as the crops step: a short, visible,
announced status message with the spinning `LoaderCircle` above the skeleton
cards, driven by the query's own pending flag, in both dictionaries.

## Acceptance criteria

- [ ] While `recommendation.varieties` is in flight, the soi screen shows a
      spinner plus a localized "loading varieties" line above the skeleton
      cards.
- [ ] The message is announced to assistive tech (`role="status"`,
      `aria-live="polite"`) and the spinner is `aria-hidden`.
- [ ] The copy lives in both dictionaries (`ro`, `en`) under the `soi`
      namespace — no hardcoded strings.
- [ ] The message is driven by the tRPC query's pending flag, not local state.
- [ ] The message disappears once the ranking resolves, and on failure the
      retry screen renders alone (no spinner, no skeleton).
- [ ] The crops step and the dashboard skeleton are unchanged (the message is
      opt-in).
- [ ] Vitest coverage for pending → resolved → error; a Playwright spec that
      sees the message on a delayed varieties call.
