"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Droplets, LocateFixed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LoadingScreen } from "@/components/agro/loading-screen";
import { PhoneHeader } from "@/components/agro/phone-header";
import { Screen } from "@/components/agro/phone-shell";
import { PrimaryCta } from "@/components/agro/primary-cta";
import { StepHeading } from "@/components/agro/step-heading";
import {
  DEFAULT_IRRIGATION,
  DEFAULT_LAND_SIZE,
  IRRIGATION_OPTIONS,
  LAND_SIZES,
  type Irrigation,
  type LandSize,
} from "@/lib/agro/mock-data";
import { nextStepPath, previousStepPath } from "@/lib/agro/plan-steps";
import { useT } from "@/lib/i18n/provider";

const STEP = "teren";

const OPTION_CLASS =
  "border-input text-muted-foreground data-[state=on]:border-brand data-[state=on]:bg-accent data-[state=on]:text-brand hover:bg-accent/60 h-[62px] flex-1 gap-2 rounded-[var(--radius-md)] border-[1.5px] text-[17.5px] font-semibold";

/** Step 1: village, land size, irrigation. "Continuă" plays the loading screen. */
export function TerenScreen() {
  const t = useT();
  const router = useRouter();
  const s = t.agro.teren;

  const [village, setVillage] = useState("");
  const [land, setLand] = useState<LandSize>(DEFAULT_LAND_SIZE);
  const [irrigation, setIrrigation] = useState<Irrigation>(DEFAULT_IRRIGATION);
  const [loading, setLoading] = useState(false);

  const next = nextStepPath(STEP);
  const goNext = useCallback(() => {
    if (next) router.push(next);
  }, [next, router]);

  if (loading) {
    return (
      <>
        <PhoneHeader />
        <LoadingScreen onDone={goNext} />
      </>
    );
  }

  return (
    <>
      <PhoneHeader backHref={previousStepPath(STEP)} step={STEP} />
      <Screen>
        <StepHeading step={STEP} title={s.title} subtitle={s.subtitle} />

        <div className="mt-[22px] flex flex-col gap-2">
          <Label htmlFor="village" className="text-[17px] font-semibold">
            {s.village.label}
          </Label>
          <div className="flex gap-2">
            <Input
              id="village"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder={s.village.placeholder}
              className="h-[60px] rounded-[var(--radius-md)] px-4 text-[19px] md:text-[19px]"
            />
            {/* Geolocation is not wired yet: disabled for assistive tech, but
                kept at full opacity so the screen matches the design. */}
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              disabled
              className="border-input size-[52px] self-center rounded-[var(--radius-md)] disabled:opacity-100"
              aria-label={s.village.detect}
            >
              <LocateFixed className="size-5" />
            </Button>
          </div>
        </div>

        <fieldset className="mt-[22px] flex flex-col gap-2">
          <legend className="mb-2 text-[17px] font-semibold">
            {s.land.label}
          </legend>
          <ToggleGroup
            type="single"
            variant="outline"
            value={land}
            onValueChange={(v) => v && setLand(v as LandSize)}
            className="w-full gap-2.5"
            aria-label={s.land.label}
          >
            {LAND_SIZES.map((size) => (
              <ToggleGroupItem key={size} value={size} className={OPTION_CLASS}>
                {s.land[size]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>

        <fieldset className="mt-[22px] flex flex-col gap-2">
          <legend className="mb-2 text-[17px] font-semibold">
            {s.irrigation.label}
          </legend>
          <ToggleGroup
            type="single"
            variant="outline"
            value={irrigation}
            onValueChange={(v) => v && setIrrigation(v as Irrigation)}
            className="w-full gap-2.5"
            aria-label={s.irrigation.label}
          >
            {IRRIGATION_OPTIONS.map((opt) => (
              <ToggleGroupItem key={opt} value={opt} className={OPTION_CLASS}>
                {opt === "yes" && <Droplets className="size-[22px]" />}
                {s.irrigation[opt]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>

        <span className="flex-1" />
        <PrimaryCta onClick={() => setLoading(true)}>
          {t.agro.wizard.continue}
        </PrimaryCta>
      </Screen>
    </>
  );
}
