"use client";

import Image from "next/image";

import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/** Intrinsic size of the downscaled artwork under `public/logos/`. */
const LOGO_WIDTH = 600;
const LOGO_HEIGHT = 227;

const SOURCES = {
  /** Green + amber lockup, for light grounds. */
  light: "/logos/logo-600.png",
  /** Cream + amber lockup, for dark grounds (auth panel, splash). */
  dark: "/logos/logo-dark-600.png",
} as const;

export type BrandVariant = keyof typeof SOURCES;

/**
 * The AgroPlan logo. Used in the phone header, the admin sidebar and the auth
 * screens. `className` constrains the height (the image keeps its aspect
 * ratio); pick the variant from the ground it sits on.
 */
export function Brand({
  className,
  imageClassName,
  variant = "light",
  showTagline = false,
}: {
  className?: string;
  imageClassName?: string;
  variant?: BrandVariant;
  showTagline?: boolean;
}) {
  const t = useT();

  return (
    <div
      data-testid="brand"
      className={cn("flex flex-col items-start gap-1", className)}
    >
      <Image
        src={SOURCES[variant]}
        alt={t.app.name}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        // `priority` is deprecated in Next 16 — the logo is above the fold on
        // every screen that renders it, so preload it from the document head.
        preload
        className={cn("h-8 w-auto", imageClassName)}
      />
      {showTagline && (
        <span className="text-muted-foreground text-xs">{t.app.tagline}</span>
      )}
    </div>
  );
}
