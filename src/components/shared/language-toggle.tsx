"use client";

import { LOCALES } from "@/lib/i18n";
import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Compact locale segmented toggle. The choice is persisted in localStorage by
 * the LanguageProvider.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "bg-muted/60 inline-flex items-center rounded-lg p-0.5",
        className,
      )}
    >
      {LOCALES.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
