import { getCrop, isCropId, type CropId } from "@/lib/agro/crop-dictionary";
import type { Locale } from "@/lib/i18n";

/**
 * Small pure helpers shared by the cultura and soi screens: the wizard URL
 * contract (Field Profile id → Crop Recommendation id → crop → variety) and
 * display formatting for dictionary crops and ISO dates.
 */

export const WIZARD_PARAMS = {
  profile: "profile",
  recommendation: "rec",
  crop: "crop",
  variety: "variety",
} as const;

export type WizardParams = Partial<
  Record<keyof typeof WIZARD_PARAMS, string | null | undefined>
>;

/** `/plan/<step>?profile=…&rec=…&crop=…&variety=…`, empty values omitted. */
export function wizardPath(step: string, params: WizardParams): string {
  const search = new URLSearchParams();
  for (const key of Object.keys(WIZARD_PARAMS) as (keyof WizardParams)[]) {
    const value = params[key];
    if (value) search.set(WIZARD_PARAMS[key], value);
  }
  const query = search.toString();
  return query ? `/plan/${step}?${query}` : `/plan/${step}`;
}

/** The chosen crop from a URL param, or null when absent or unknown. */
export function cropIdFromParam(value: string | null): CropId | null {
  return value && isCropId(value) ? value : null;
}

export function cropDisplayName(cropId: CropId, locale: Locale): string {
  const crop = getCrop(cropId);
  return locale === "ro" ? crop.name_ro : crop.name_en;
}

/** "1 oct." style day + short month in the viewer's locale. */
export function formatShortDate(isoDate: string, locale: Locale): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/** Replace `{name}` placeholders in dictionary copy. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
