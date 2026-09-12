"use client";

import { useState } from "react";
import Link from "next/link";

import { ChoiceCard } from "@/components/agro/choice-card";
import { PhoneHeader } from "@/components/agro/phone-header";
import { Screen } from "@/components/agro/phone-shell";
import { PrimaryCta } from "@/components/agro/primary-cta";
import { ReasonList } from "@/components/agro/reason-list";
import { StepHeading } from "@/components/agro/step-heading";
import { StickyBar } from "@/components/agro/sticky-bar";
import { FactBadge, SuccessBadge } from "@/components/agro/badges";
import {
  RECOMMENDED_VARIETY,
  VARIETIES,
  type VarietyId,
} from "@/lib/agro/mock-data";
import { nextStepPath, previousStepPath } from "@/lib/agro/plan-steps";
import { useT } from "@/lib/i18n/provider";

const STEP = "soi";

/** Step 3: varieties of the chosen crop; pick one. */
export function SoiScreen() {
  const t = useT();
  const s = t.agro.soi;
  const [selected, setSelected] = useState<VarietyId>(RECOMMENDED_VARIETY);

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
          {VARIETIES.map((id) => (
            <li key={id}>
              <ChoiceCard
                selected={id === selected}
                onSelect={() => setSelected(id)}
              >
                <span className="block text-[19px] font-semibold">
                  {s.varieties[id].name}
                </span>
                <span className="text-subtle mt-1 block text-[15.5px] leading-[1.5]">
                  {s.varieties[id].description}
                </span>
                <ReasonList reasons={s.varieties[id].reasons} />
                <span className="mt-2.5 flex flex-wrap gap-2">
                  {id === RECOMMENDED_VARIETY && (
                    <SuccessBadge>{t.agro.cultura.recommended}</SuccessBadge>
                  )}
                  <FactBadge>{s.varieties[id].tag}</FactBadge>
                </span>
              </ChoiceCard>
            </li>
          ))}
        </ul>
      </Screen>
      <StickyBar>
        <PrimaryCta asChild>
          <Link href={nextStepPath(STEP) ?? "/"}>{s.cta}</Link>
        </PrimaryCta>
      </StickyBar>
    </>
  );
}
