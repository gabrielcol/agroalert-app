"use client";

import {
  planStepIndex,
  PLAN_STEPS,
  type PlanStep,
} from "@/lib/agro/plan-steps";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/** "Pasul n din 4" kicker + title + subtitle used on every wizard screen. */
export function StepHeading({
  step,
  title,
  subtitle,
  compact = false,
}: {
  step?: PlanStep;
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  const t = useT();

  return (
    <div>
      {step && (
        <p className="text-brand mb-2.5 text-[15px] font-bold tracking-[0.02em] uppercase">
          {t.agro.wizard.stepOf
            .replace("{n}", String(planStepIndex(step)))
            .replace("{total}", String(PLAN_STEPS.length))}
        </p>
      )}
      <h1
        className={cn(
          "text-[28px] leading-[1.25] font-semibold tracking-[-0.03em]",
          compact && "text-[21px]",
        )}
      >
        {title}
      </h1>
      <p className="text-muted-foreground mt-2 text-[17.5px] leading-[1.55]">
        {subtitle}
      </p>
    </div>
  );
}
