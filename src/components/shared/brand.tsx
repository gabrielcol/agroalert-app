"use client";

import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * The AgroPlan mark: a cream calendar (two ring tabs, thick frame) on a forest
 * green tile, with an amber two-leaf sprout rising from a cream field curve.
 *
 * The tile green and the frame cream are fixed in both themes — it is a logo,
 * not a surface — so the mark keeps its contrast on a light or dark header.
 * Only the sprout follows `--brand-amber`, which lightens slightly in the dark.
 */
export function AgroPlanMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-9 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="16" fill="var(--brand-green)" />
      <rect
        x="21"
        y="8"
        width="5"
        height="10"
        rx="2.5"
        fill="var(--brand-cream)"
      />
      <rect
        x="38"
        y="8"
        width="5"
        height="10"
        rx="2.5"
        fill="var(--brand-cream)"
      />
      <rect
        x="9"
        y="14"
        width="46"
        height="41"
        rx="10"
        fill="var(--brand-cream)"
      />
      <rect
        x="15"
        y="24"
        width="34"
        height="25"
        rx="3"
        fill="var(--brand-green)"
      />
      <path
        d="M32 40c-6 0-10-4-10-10 6 0 10 4 10 10Z"
        fill="var(--brand-amber)"
      />
      <path
        d="M32 40c0-7 5-12 12-12 0 7-5 12-12 12Z"
        fill="var(--brand-amber)"
      />
      <path
        d="M32 44.5V37"
        stroke="var(--brand-amber)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M15 47.3c9-5.8 23-4.8 34 1.2"
        stroke="var(--brand-cream)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Splits the app name into its foreground half and its amber half. Only a name
 * ending in "Plan" is split, so a whitelabel fork that renames the app in the
 * dictionaries still gets a sensible wordmark.
 */
function splitWordmark(name: string): [string, string] {
  const suffix = "Plan";
  return name.length > suffix.length && name.endsWith(suffix)
    ? [name.slice(0, -suffix.length), suffix]
    : [name, ""];
}

/** App wordmark + logo mark. Used in the phone header, sidebar and auth screens. */
export function Brand({
  className,
  showTagline = false,
  iconClassName,
}: {
  className?: string;
  showTagline?: boolean;
  iconClassName?: string;
}) {
  const t = useT();
  const [head, tail] = splitWordmark(t.app.name);

  return (
    <div
      data-testid="brand"
      className={cn("flex items-center gap-2.5", className)}
    >
      <AgroPlanMark className={iconClassName} />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-base font-black tracking-tight">
          <span>{head}</span>
          {tail && <span className="text-brand-amber">{tail}</span>}
        </span>
        {showTagline && (
          <span className="text-muted-foreground mt-1 text-xs">
            {t.app.tagline}
          </span>
        )}
      </span>
    </div>
  );
}
