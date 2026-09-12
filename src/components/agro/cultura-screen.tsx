"use client";

import { useState } from "react";
import Link from "next/link";
import { Flower2, Sprout, Wheat, type LucideIcon } from "lucide-react";

import { ChoiceCard } from "@/components/agro/choice-card";
import { PhoneHeader } from "@/components/agro/phone-header";
import { Screen } from "@/components/agro/phone-shell";
import { PrimaryCta } from "@/components/agro/primary-cta";
import { ReasonList } from "@/components/agro/reason-list";
import { StepHeading } from "@/components/agro/step-heading";
import { SuccessBadge } from "@/components/agro/badges";
import { CROPS, RECOMMENDED_CROP, type CropId } from "@/lib/agro/mock-data";
import { nextStepPath, previousStepPath } from "@/lib/agro/plan-steps";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const STEP = "cultura";

const ICONS: Record<CropId, LucideIcon> = {
  grau: Wheat,
  orz: Sprout,
  rapita: Flower2,
};

/** Step 2: recommended crops for the land profile; pick one. */
export function CulturaScreen() {
  const t = useT();
  const s = t.agro.cultura;
  const [selected, setSelected] = useState<CropId>(RECOMMENDED_CROP);

  return (
    <>
      <PhoneHeader
        backHref={previousStepPath(STEP)}
        title={s.header}
        step={STEP}
      />
      <Screen>
        <StepHeading
          step={STEP}
          title={s.title}
          subtitle={s.subtitle}
          compact
        />

        <ul className="mt-5 flex flex-col gap-3">
          {CROPS.map((id) => {
            const Icon = ICONS[id];
            const isSelected = id === selected;
            return (
              <li key={id}>
                <ChoiceCard
                  selected={isSelected}
                  onSelect={() => setSelected(id)}
                  className="flex items-start gap-3.5"
                >
                  <span
                    className={cn(
                      "bg-secondary text-brand grid size-[46px] shrink-0 place-items-center rounded-xl",
                      isSelected && "bg-card",
                    )}
                  >
                    <Icon className="size-6" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[19px] font-semibold">
                      {s.crops[id].name}
                    </span>
                    <span className="text-subtle mt-0.5 block text-[15.5px]">
                      {s.crops[id].description}
                    </span>
                    <ReasonList reasons={s.crops[id].reasons} />
                    {id === RECOMMENDED_CROP && (
                      <SuccessBadge className="mt-2.5">
                        {s.recommended}
                      </SuccessBadge>
                    )}
                  </span>
                </ChoiceCard>
              </li>
            );
          })}
        </ul>

        <span className="flex-1" />
        <PrimaryCta asChild>
          <Link href={nextStepPath(STEP) ?? "/"}>{t.agro.wizard.continue}</Link>
        </PrimaryCta>
      </Screen>
    </>
  );
}
