"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
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
import { StickyBar } from "@/components/agro/sticky-bar";
import {
  SOIL_CLASSES,
  type FieldLocation,
  type SoilClass,
} from "@/lib/agro/field-profile";
import {
  DEFAULT_IRRIGATION,
  DEFAULT_LAND_SIZE,
  IRRIGATION_OPTIONS,
  LAND_SIZES,
  type Irrigation,
  type LandSize,
} from "@/lib/agro/mock-data";
import { stepsThrough } from "@/lib/agro/loading-stages";
import { previousStepPath } from "@/lib/agro/plan-steps";
import { useT } from "@/lib/i18n/provider";
import { useTRPC } from "@/trpc/client";

const STEP = "teren";
const DEFAULT_SOIL: SoilClass = "unknown";
const GEOLOCATION_TIMEOUT_MS = 10_000;

const OPTION_CLASS =
  "border-input text-muted-foreground data-[state=on]:border-brand data-[state=on]:bg-accent data-[state=on]:text-brand hover:bg-accent/60 h-[62px] flex-1 gap-2 rounded-[var(--radius-md)] border-[1.5px] text-[17.5px] font-semibold";
const SOIL_OPTION_CLASS =
  "border-input text-muted-foreground data-[state=on]:border-brand data-[state=on]:bg-accent data-[state=on]:text-brand hover:bg-accent/60 h-[52px] min-w-[calc(50%-5px)] flex-1 rounded-[var(--radius-md)] border-[1.5px] text-[16.5px] font-semibold";

/** Where the wizard continues once the Crop Recommendation is ready. */
export function culturaPath(profileId: string) {
  return `/plan/cultura?profile=${encodeURIComponent(profileId)}`;
}

/**
 * Step 1: village, land size, irrigation, Soil Class. "Continuă" resolves
 * the Field Location (typed name → Open-Meteo geocoding, first match; or the
 * phone's position), creates the Field Profile, warms the Weather Brief one
 * slice at a time and asks for the Crop Recommendation — one call per step
 * of the loader — then lands on the cultura step with the profile id in the
 * URL.
 */
export function TerenScreen() {
  const t = useT();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const s = t.agro.teren;

  const [village, setVillage] = useState("");
  const [location, setLocation] = useState<FieldLocation | null>(null);
  const [villageError, setVillageError] = useState<string | null>(null);
  const [land, setLand] = useState<LandSize>(DEFAULT_LAND_SIZE);
  const [irrigation, setIrrigation] = useState<Irrigation>(DEFAULT_IRRIGATION);
  const [soil, setSoil] = useState<SoilClass>(DEFAULT_SOIL);

  const [loading, setLoading] = useState(false);
  // How many of the loader's four calls have come back. A retry replays the
  // sequence from the start, so this can drop back; the loader's own step
  // never rewinds, it just goes from "done" to "active" again.
  const [completed, setCompleted] = useState(0);
  const [failed, setFailed] = useState(false);
  // The created Field Profile survives a retry so we never create it twice.
  const profileIdRef = useRef<string | null>(null);

  const createProfile = useMutation(trpc.fieldProfile.create.mutationOptions());

  const canSubmit = location !== null || village.trim().length >= 2;

  const run = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      let point = location;
      if (!point) {
        const matches = await queryClient.fetchQuery(
          trpc.geocode.search.queryOptions({ query: village.trim() }),
        );
        const first = matches[0];
        if (!first) {
          setLoading(false);
          setVillageError(s.village.notFound);
          return;
        }
        point = { lat: first.lat, lng: first.lng };
        setLocation(point);
      }
      setCompleted(stepsThrough("location"));

      let profileId = profileIdRef.current;
      if (!profileId) {
        const profile = await createProfile.mutateAsync({
          ...point,
          villageName: village.trim() || s.village.located,
          landBucket: land,
          irrigation: irrigation === "yes",
          soilClass: soil,
        });
        profileId = profile.id;
        profileIdRef.current = profileId;
      }

      // One call per displayed step: the ten-year archive, then the
      // forecast / current season / outlook, then the model — which now
      // finds the Weather Brief warm in the per-cell cache.
      await queryClient.fetchQuery(
        trpc.weather.climate.queryOptions({ fieldProfileId: profileId }),
      );
      setCompleted(stepsThrough("history"));

      await queryClient.fetchQuery(
        trpc.weather.forecast.queryOptions({ fieldProfileId: profileId }),
      );
      setCompleted(stepsThrough("forecast"));

      await queryClient.fetchQuery(
        trpc.recommendation.crops.queryOptions({ fieldProfileId: profileId }),
      );
      setCompleted(stepsThrough("recommendation"));
    } catch {
      setFailed(true);
    }
  }, [
    createProfile,
    irrigation,
    land,
    location,
    queryClient,
    s.village.located,
    s.village.notFound,
    soil,
    trpc,
    village,
  ]);

  const goNext = useCallback(() => {
    const id = profileIdRef.current;
    if (id) router.push(culturaPath(id));
  }, [router]);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setVillageError(s.village.denied);
      return;
    }
    setVillageError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setVillage(s.village.located);
      },
      () => setVillageError(s.village.denied),
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  }, [s.village.denied, s.village.located]);

  if (loading) {
    return (
      <>
        <PhoneHeader />
        <LoadingScreen
          completed={completed}
          error={failed}
          onRetry={() => void run()}
          onDone={goNext}
        />
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
              onChange={(e) => {
                setVillage(e.target.value);
                setVillageError(null);
                // A typed name replaces a point taken from the phone.
                if (e.target.value !== s.village.located) setLocation(null);
              }}
              placeholder={s.village.placeholder}
              aria-invalid={villageError ? true : undefined}
              aria-describedby={villageError ? "village-error" : undefined}
              className="h-[60px] rounded-[var(--radius-md)] px-4 text-[19px] md:text-[19px]"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={locate}
              className="border-input size-[52px] self-center rounded-[var(--radius-md)]"
              aria-label={s.village.detect}
            >
              <LocateFixed className="size-5" />
            </Button>
          </div>
          {villageError && (
            <p
              id="village-error"
              role="alert"
              className="text-destructive text-[15px]"
            >
              {villageError}
            </p>
          )}
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

        <fieldset className="mt-[22px] flex flex-col gap-2">
          <legend className="mb-2 text-[17px] font-semibold">
            {s.soil.label}
          </legend>
          <ToggleGroup
            type="single"
            variant="outline"
            value={soil}
            onValueChange={(v) => v && setSoil(v as SoilClass)}
            className="w-full flex-wrap gap-2.5"
            aria-label={s.soil.label}
          >
            {SOIL_CLASSES.map((cls) => (
              <ToggleGroupItem
                key={cls}
                value={cls}
                className={SOIL_OPTION_CLASS}
              >
                {s.soil[cls]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>
      </Screen>
      <StickyBar>
        <PrimaryCta disabled={!canSubmit} onClick={() => void run()}>
          {t.agro.wizard.continue}
        </PrimaryCta>
      </StickyBar>
    </>
  );
}
