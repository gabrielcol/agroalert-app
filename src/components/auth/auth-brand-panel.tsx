"use client";

import { Check, Sprout } from "lucide-react";

import { useT } from "@/lib/i18n/provider";

/** Branded left panel for the auth screens (hidden on small viewports). */
export function AuthBrandPanel() {
  const t = useT();

  return (
    <div className="bg-primary text-primary-foreground relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
      <div className="flex items-center gap-2.5">
        <span className="bg-primary-foreground/15 flex size-9 items-center justify-center rounded-lg">
          <Sprout className="size-5" />
        </span>
        <span className="text-lg font-bold">{t.app.name}</span>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-primary-foreground text-3xl font-bold">
            {t.auth.heading}
          </h2>
          <p className="text-primary-foreground/80 max-w-md text-pretty">
            {t.auth.subtitle}
          </p>
        </div>
        <ul className="space-y-3">
          {t.auth.points.map((point, index) => (
            <li key={index} className="flex items-center gap-3">
              <span className="bg-primary-foreground/15 flex size-6 shrink-0 items-center justify-center rounded-full">
                <Check className="size-3.5" />
              </span>
              <span className="text-primary-foreground/90 text-sm">
                {point}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-primary-foreground/60 text-xs">{t.app.tagline}</p>

      {/* Decorative glow */}
      <div className="bg-primary-foreground/10 pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full blur-3xl" />
    </div>
  );
}
