"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sprout, Wheat } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PhoneHeader } from "@/components/agro/phone-header";
import { Screen } from "@/components/agro/phone-shell";
import { RecommendationSkeleton } from "@/components/agro/recommendation-state";
import { StepHeading } from "@/components/agro/step-heading";
import { StickyBar } from "@/components/agro/sticky-bar";
import { SuccessBadge } from "@/components/agro/badges";
import { nextStage } from "@/lib/agro/crop-calendar";
import { planStepPath } from "@/lib/agro/plan-steps";
import {
  cropDisplayName,
  fill,
  formatLongDate,
  wizardPath,
} from "@/lib/agro/recommendation-ui";
import type { SowingPlan } from "@/lib/agro/sowing-plan";
import { useSowingPlanIds } from "@/lib/agro/sowing-plan-storage";
import { useLanguage } from "@/lib/i18n/provider";
import { useTRPC } from "@/trpc/client";

/**
 * "Culturile tale": the Sowing Plans this browser created (issue 0008; no
 * farmer accounts yet), newest first, or the empty state, plus the add CTA.
 */
export function DashboardScreen() {
  const { t } = useLanguage();
  const d = t.agro.dashboard;
  const ids = useSowingPlanIds();
  const trpc = useTRPC();
  const [today] = useState(() => new Date());

  const query = useQuery(
    trpc.sowingPlan.byIds.queryOptions({ ids }, { enabled: ids.length > 0 }),
  );
  const plans = ids.length === 0 ? [] : (query.data ?? null);

  return (
    <>
      <PhoneHeader />
      <Screen>
        <StepHeading title={d.title} subtitle={d.subtitle} />

        {plans === null ? (
          <RecommendationSkeleton count={ids.length} />
        ) : plans.length > 0 ? (
          <ul className="mt-[22px] flex flex-col gap-3">
            {plans.map((plan) => (
              <li key={plan.id}>
                <PlanRow plan={plan} today={today} />
              </li>
            ))}
          </ul>
        ) : (
          <DashboardEmpty />
        )}
      </Screen>
      <StickyBar>
        <Button
          asChild
          variant="outline"
          className="border-input text-muted-foreground hover:border-brand-line hover:text-brand hover:bg-accent h-[62px] w-full rounded-[var(--radius-md)] border-[1.5px] border-dashed text-[17.5px] font-semibold shadow-none"
        >
          <Link href={planStepPath("teren")}>
            <Plus className="size-5" />
            {d.add}
          </Link>
        </Button>
      </StickyBar>
    </>
  );
}

function PlanRow({ plan, today }: { plan: SowingPlan; today: Date }) {
  const { t, locale } = useLanguage();
  const d = t.agro.dashboard;
  const rows = t.agro.rezumat.calendar.rows;

  const next = nextStage(plan.sownAt, today);
  const nextLabel = next
    ? next.daysUntil === 0
      ? fill(d.nextToday, { stage: rows[next.id].title })
      : fill(d.nextStage, { stage: rows[next.id].title, n: next.daysUntil })
    : d.finished;

  return (
    <Link
      href={wizardPath("rezumat", {
        profile: plan.fieldProfileId,
        crop: plan.cropId,
        variety: plan.varietyName,
      })}
      className="bg-card border-input hover:border-brand-line flex items-center gap-3.5 rounded-[var(--radius-lg)] border-[1.5px] px-[18px] py-4 transition-colors"
    >
      <span className="bg-accent text-brand grid size-[46px] shrink-0 place-items-center rounded-xl">
        <Sprout className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[19px] font-semibold">
          {[cropDisplayName(plan.cropId, locale), plan.varietyName]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <span className="text-subtle mt-[3px] block text-[15px]">
          {fill(d.sownOn, { date: formatLongDate(plan.sownAt, locale) })}
        </span>
        <span className="text-subtle block text-[15px]">{nextLabel}</span>
      </span>
      <SuccessBadge>{d.active}</SuccessBadge>
    </Link>
  );
}

function DashboardEmpty() {
  const { t } = useLanguage();
  return (
    <div className="text-subtle mt-[22px] px-5 py-10 text-center">
      <span className="bg-secondary text-faint mx-auto mb-3.5 grid size-[52px] place-items-center rounded-[14px]">
        <Wheat className="size-6" />
      </span>
      <p className="text-foreground text-[15px] font-semibold">
        {t.agro.dashboard.emptyTitle}
      </p>
      <p className="mt-1 text-[13.5px]">{t.agro.dashboard.emptyBody}</p>
    </div>
  );
}
