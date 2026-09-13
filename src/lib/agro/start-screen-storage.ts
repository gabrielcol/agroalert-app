"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether this browser session has already seen the AgroPlan splash (issue
 * 0017). Per **session**, not per device: `sessionStorage` is scoped to the
 * tab, so a new tab or a restarted browser welcomes the farmer again while a
 * reload or a return from `/plan/*` does not. Nothing here depends on auth.
 */

export const START_SCREEN_SEEN_KEY = "agro.startScreenSeen";

/** `true` once the splash has handed over in this session; `false` on the server. */
export function readStartScreenSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(START_SCREEN_SEEN_KEY) === "1";
  } catch {
    // Storage disabled (private mode, blocked cookies) — the splash simply
    // plays every time rather than breaking the page.
    return false;
  }
}

/** Remember that the splash has played; safe to call when storage is unavailable. */
export function markStartScreenSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(START_SCREEN_SEEN_KEY, "1");
  } catch {
    // See above: not remembering is the acceptable degradation.
  }
}

// --- External store ---------------------------------------------------------

// The flag only ever changes from this component (via `markStartScreenSeen`,
// which re-renders on its own), so there is nothing to subscribe to: the same
// external-store shape as `sowing-plan-storage.ts`, minus the listeners.
function subscribe(): () => void {
  return () => {};
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Whether the splash has already played in this session. The server snapshot is
 * `false` — the server cannot read `sessionStorage` — so SSR and the first
 * client render agree on the splash markup, and React re-renders with the real
 * value synchronously during hydration (no mismatch, no setState in an effect).
 */
export function useStartScreenSeen(): boolean {
  return useSyncExternalStore(
    subscribe,
    readStartScreenSeen,
    getServerSnapshot,
  );
}
