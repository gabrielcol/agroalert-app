"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";

import { ChoiceCard } from "@/components/agro/choice-card";
import { PhoneHeader } from "@/components/agro/phone-header";
import { Screen } from "@/components/agro/phone-shell";
import { PrimaryCta } from "@/components/agro/primary-cta";
import { RecommendationReasons } from "@/components/agro/recommendation-reasons";
import {
  RecommendationSkeleton,
  RetryScreen,
} from "@/components/agro/recommendation-state";
import { StepHeading } from "@/components/agro/step-heading";
import { StickyBar } from "@/components/agro/sticky-bar";
import { FactBadge, SuccessBadge } from "@/components/agro/badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { planStepPath } from "@/lib/agro/plan-steps";
import {
  WIZARD_PARAMS,
  cropDisplayName,
  cropIdFromParam,
  fill,
  wizardPath,
} from "@/lib/agro/recommendation-ui";
import { useLanguage } from "@/lib/i18n/provider";
import { useTRPC } from "@/trpc/client";

const STEP = "soi";

/**
 * Step 3: the Variety Recommendation for the crop chosen on step 2
 * (`?profile=…&rec=…&crop=…`). Every dictionary variety of that crop, ranked.
 */
export function SoiScreen() {
  const { t, locale } = useLanguage();
  const s = t.agro.soi;
  const router = useRouter();
  const params = useSearchParams();
  const profileId = params.get(WIZARD_PARAMS.profile);
  const recommendationId = params.get(WIZARD_PARAMS.recommendation);
  const cropId = cropIdFromParam(params.get(WIZARD_PARAMS.crop));
  const ready = Boolean(profileId && recommendationId && cropId);
  const trpc = useTRPC();
  /**
   * Where the not-ready notice sends the farmer: back to the crop step when we
   * at least know the parcel, to the start of the wizard otherwise. The same
   * destination the redirect below aims for, so the notice is never a dead end
   * if that navigation is slow or fails.
   */
  const backHref = profileId
    ? wizardPath("cultura", { profile: profileId })
    : planStepPath("teren");

  useEffect(() => {
    if (!profileId) router.replace(planStepPath("teren"));
    else if (!recommendationId || !cropId) {
      router.replace(wizardPath("cultura", { profile: profileId }));
    }
  }, [profileId, recommendationId, cropId, router]);

  const query = useQuery(
    trpc.recommendation.varieties.queryOptions(
      {
        cropRecommendationId: recommendationId ?? "",
        cropId: cropId ?? "grau_toamna",
      },
      { enabled: ready, retry: false, staleTime: Infinity },
    ),
  );

  const [picked, setPicked] = useState<string | null>(null);
  const ranked = query.data?.result.ranked ?? [];
  const selected = picked ?? ranked[0]?.varietyName ?? null;

  const cropName = cropId ? cropDisplayName(cropId, locale) : "";
  const continueHref = query.data
    ? wizardPath("rezumat", {
        profile: profileId,
        recommendation: recommendationId,
        crop: cropId,
        variety: selected,
      })
    : null;

  return (
    <>
      <PhoneHeader
        backHref={wizardPath("cultura", { profile: profileId })}
        title={s.header}
        step={STEP}
      />
      <Screen>
        <StepHeading
          step={STEP}
          title={cropName ? fill(s.titleFor, { crop: cropName }) : s.title}
          subtitle={s.subtitle}
          compact
        />

        {/*
          Without profile, rec and crop the query is disabled and nothing is in
          flight, so this is the only thing between the heading and the
          disabled CTA — it must never be nothing (issue 0021). The effect above
          is redirecting meanwhile; the notice carries the same way back.
        */}
        {!ready && (
          <Alert className="mt-5" data-testid="soi-not-ready">
            <Info />
            <AlertTitle>{s.notReady.title}</AlertTitle>
            <AlertDescription>
              <p>{s.notReady.description}</p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-3 w-fit"
              >
                <Link href={backHref}>{s.notReady.action}</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/*
          The varieties model call is the only thing happening on this screen
          and takes tens of seconds, so the skeleton carries the spinner and
          the status line too (issue 0022). `isPending` is false the moment the
          query errors, so the retry screen below renders alone.
        */}
        {query.isPending && ready && (
          <RecommendationSkeleton message={s.ranking.loading} />
        )}

        {query.isError && (
          <RetryScreen
            title={t.agro.cultura.recommendation.retryTitle}
            description={
              query.error.message === "WEATHER_UNAVAILABLE"
                ? t.agro.cultura.recommendation.retry
                : t.agro.cultura.recommendation.retryAi
            }
            action={t.agro.cultura.recommendation.retryAction}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        )}

        {query.data && ranked.length === 0 && (
          <p className="text-subtle mt-5 text-[15.5px]">{s.ranking.empty}</p>
        )}

        {query.data && ranked.length > 0 && (
          <ol className="mt-5 flex flex-col gap-3">
            {ranked.map((variety, index) => (
              // The index keeps the key unique even if a duplicate name slips
              // past `enforceVarietyCoverage` (issue 0021).
              <li key={`${variety.varietyName}-${index}`}>
                <ChoiceCard
                  selected={variety.varietyName === selected}
                  onSelect={() => setPicked(variety.varietyName)}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="block text-[19px] font-semibold">
                      <span className="text-faint mr-2 text-[15px] font-bold">
                        {fill(s.ranking.rank, { n: index + 1 })}
                      </span>
                      {variety.varietyName}
                    </span>
                    <span className="text-brand shrink-0 text-[15px] font-bold">
                      {fill(s.ranking.fit, { n: variety.fit })}
                    </span>
                  </span>
                  <RecommendationReasons reasons={variety.reasons} />
                  <span className="mt-2.5 flex flex-wrap gap-2">
                    {index === 0 && (
                      <SuccessBadge>{t.agro.cultura.recommended}</SuccessBadge>
                    )}
                    <FactBadge>{cropName}</FactBadge>
                  </span>
                </ChoiceCard>
              </li>
            ))}
          </ol>
        )}
      </Screen>
      <StickyBar>
        {continueHref ? (
          <PrimaryCta asChild>
            <Link href={continueHref}>{s.cta}</Link>
          </PrimaryCta>
        ) : (
          <PrimaryCta disabled>{s.cta}</PrimaryCta>
        )}
      </StickyBar>
    </>
  );
}
