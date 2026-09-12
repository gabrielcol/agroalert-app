"use client";

import Link from "next/link";
import { Plus, Sprout, Wheat } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PhoneHeader } from "@/components/agro/phone-header";
import { Screen } from "@/components/agro/phone-shell";
import { StepHeading } from "@/components/agro/step-heading";
import { SuccessBadge } from "@/components/agro/badges";
import { SAMPLE_PLANS } from "@/lib/agro/mock-data";
import { planStepPath } from "@/lib/agro/plan-steps";
import { useT } from "@/lib/i18n/provider";

/** "Culturile tale": the list of sowing plans (or the empty state) + add CTA. */
export function DashboardScreen() {
  const t = useT();
  const d = t.agro.dashboard;

  return (
    <>
      <PhoneHeader />
      <Screen>
        <StepHeading title={d.title} subtitle={d.subtitle} />

        {SAMPLE_PLANS.length > 0 ? (
          <ul className="mt-[22px] flex flex-col gap-3">
            {SAMPLE_PLANS.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={planStepPath("rezumat")}
                  className="bg-card border-input hover:border-brand-line flex items-center gap-3.5 rounded-[var(--radius-lg)] border-[1.5px] px-[18px] py-4 transition-colors"
                >
                  <span className="bg-accent text-brand grid size-[46px] shrink-0 place-items-center rounded-xl">
                    <Sprout className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[19px] font-semibold">
                      {d.sample.crop} · {d.sample.variety}
                    </span>
                    <span className="text-subtle mt-[3px] block text-[15px]">
                      {d.alertsActive} · {t.agro.done.channel[plan.channel]}
                    </span>
                  </span>
                  <SuccessBadge>{d.active}</SuccessBadge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <DashboardEmpty />
        )}

        <Button
          asChild
          variant="outline"
          className="border-input text-muted-foreground hover:border-brand-line hover:text-brand hover:bg-accent mt-3.5 h-[62px] w-full rounded-[var(--radius-md)] border-[1.5px] border-dashed text-[17.5px] font-semibold shadow-none"
        >
          <Link href={planStepPath("teren")}>
            <Plus className="size-5" />
            {d.add}
          </Link>
        </Button>
      </Screen>
    </>
  );
}

function DashboardEmpty() {
  const t = useT();
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
