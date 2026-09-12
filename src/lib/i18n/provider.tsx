"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  DEFAULT_LOCALE,
  LOCALES,
  STORAGE_KEY,
  dictionaries,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";

// --- Tiny external store for the persisted locale ---------------------------
// Using useSyncExternalStore keeps server/first-client render on the default
// locale (no hydration mismatch) while reading the persisted choice, and syncs
// the value across tabs — without calling setState inside an effect.

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

function isLocale(value: string | null): value is Locale {
  return (LOCALES as readonly string[]).includes(value ?? "");
}

function getSnapshot(): Locale {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage disabled — fall back to the default locale.
  }
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function persistLocale(next: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage disabled — the choice still applies for this page load.
  }
  document.documentElement.lang = next;
  emit();
}

// --- Context ----------------------------------------------------------------

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: Dictionary;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Keep <html lang> in sync with the active locale — including the persisted
  // value picked up after hydration (which bypasses persistLocale).
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => persistLocale(next), []);
  const toggleLocale = useCallback(() => {
    const index = LOCALES.indexOf(locale);
    persistLocale(LOCALES[(index + 1) % LOCALES.length]);
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, setLocale, toggleLocale, t: dictionaries[locale] }),
    [locale, setLocale, toggleLocale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}

/** Convenience hook: returns the active dictionary for the current locale. */
export function useT(): Dictionary {
  return useLanguage().t;
}
