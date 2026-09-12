"use client";

import { useSyncExternalStore } from "react";

import { MAX_PLAN_IDS } from "@/lib/agro/sowing-plan";

/**
 * The ids of the Sowing Plans this browser created (issue 0008). Farmers have
 * no account, so the dashboard lists whatever this device remembers. Same
 * external-store shape as the locale in `src/lib/i18n/provider.tsx`: the
 * server and first client render see an empty list (no hydration mismatch),
 * and no setState runs inside an effect.
 */

export const SOWING_PLAN_IDS_KEY = "agro.sowingPlanIds";

const EMPTY: string[] = [];

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(SOWING_PLAN_IDS_KEY);
  } catch {
    return null;
  }
}

function parseIds(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY;
    const ids = value.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
    return ids.length === 0 ? EMPTY : ids.slice(0, MAX_PLAN_IDS);
  } catch {
    return EMPTY;
  }
}

/** The plan ids stored in this browser, newest first; `[]` when none or unreadable. */
export function readSowingPlanIds(): string[] {
  return parseIds(readRaw());
}

/** Remember a newly created plan (prepended, de-duplicated, capped). */
export function addSowingPlanId(id: string): void {
  const next = [id, ...readSowingPlanIds().filter((x) => x !== id)].slice(
    0,
    MAX_PLAN_IDS,
  );
  try {
    window.localStorage.setItem(SOWING_PLAN_IDS_KEY, JSON.stringify(next));
  } catch {
    // Storage disabled — the plan still shows for this page load via the
    // summary's own query; the dashboard will not remember it.
  }
  emit();
}

// --- External store ---------------------------------------------------------

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// useSyncExternalStore needs a referentially stable snapshot: cache the parsed
// list and re-parse only when the raw string changes.
let cachedRaw: string | null | undefined;
let cachedIds: string[] = EMPTY;

function getSnapshot(): string[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = parseIds(raw);
  }
  return cachedIds;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

/** The plan ids this browser remembers, kept in sync across tabs. */
export function useSowingPlanIds(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
