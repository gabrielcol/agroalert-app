"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shared/brand";
import { useT } from "@/lib/i18n/provider";
import {
  PLAN_STEPS,
  planStepIndex,
  type PlanStep,
} from "@/lib/agro/plan-steps";
import { cn } from "@/lib/utils";

/**
 * Phone-frame header: optional back arrow, the brand (or a screen title in its
 * place) and, inside the wizard, the 4-dot progress indicator.
 */
export function PhoneHeader({
  backHref,
  title,
  step,
}: {
  backHref?: string;
  title?: string;
  step?: PlanStep;
}) {
  const t = useT();

  return (
    <header className="bg-background sticky top-0 z-20 flex items-center gap-3 border-b px-5 pt-[18px] pb-3.5">
      {backHref && (
        <Button
          asChild
          variant="ghost"
          size="icon-lg"
          className="text-muted-foreground -ml-1.5 size-[38px]"
        >
          <Link href={backHref} aria-label={t.agro.wizard.back}>
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
      )}
      {title ? (
        <span className="text-lg font-semibold tracking-tight">{title}</span>
      ) : (
        <Brand imageClassName="h-7 w-auto" />
      )}
      {step && (
        <span className="ml-auto flex gap-[7px]" aria-hidden="true">
          {PLAN_STEPS.map((s, i) => (
            <i
              key={s}
              className={cn(
                "bg-input block h-2 w-2 rounded-full",
                i + 1 === planStepIndex(step) && "bg-brand w-5",
              )}
            />
          ))}
        </span>
      )}
    </header>
  );
}
