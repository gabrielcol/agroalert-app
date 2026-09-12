import { en, type Dictionary } from "./dictionaries/en";
import { ro } from "./dictionaries/ro";

export const LOCALES = ["en", "ro"] as const;
export type Locale = (typeof LOCALES)[number];

/** English is the default; other locales are available via the toggle. */
export const DEFAULT_LOCALE: Locale = "en";

export const STORAGE_KEY = "app-locale";

export const dictionaries: Record<Locale, Dictionary> = { en, ro };

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ro: "Română",
};

export type { Dictionary };
