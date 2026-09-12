"use client";

import { ShieldCheck } from "lucide-react";

import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/** App wordmark + logo mark. Used in the sidebar, auth screens and landing. */
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

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm",
          iconClassName,
        )}
      >
        <ShieldCheck className="size-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-heading text-base font-bold tracking-tight">
          {t.app.name}
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
