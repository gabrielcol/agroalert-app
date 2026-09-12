"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Flower2,
  Sprout,
  Wheat,
  type LucideIcon,
} from "lucide-react";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getCrop, type CropId } from "@/lib/agro/crop-dictionary";
import { planStepPath, previousStepPath } from "@/lib/agro/plan-steps";
import type { RecommendedCrop } from "@/lib/agro/recommendation-schema";
import {
  WIZARD_PARAMS,
  cropDisplayName,
  fill,
  formatShortDate,
  wizardPath,
} from "@/lib/agro/recommendation-ui";
import { useLanguage } from "@/lib/i18n/provider";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";

const STEP = "cultura";

const GROUP_ICONS: Record<string, LucideIcon> = {
  cereale: Wheat,
  oleaginoase_industriale: Flower2,
  leguminoase_furajere: Sprout,
};

/**
 * Step 2: the Crop Recommendation for the Field Profile named in the URL
 * (`?profile=<id>`). Top 3 as choice cards, the rest collapsed; a failed
 * recommendation shows the retry screen and nothing else.
 */
export function CulturaScreen() {
  const { t, locale } = useLanguage();
  const s = t.agro.cultura;
  const router = useRouter();
  const params = useSearchParams();
  const profileId = params.get(WIZARD_PARAMS.profile);
  const trpc = useTRPC();

  useEffect(() => {
    if (!profileId) router.replace(planStepPath("teren"));
  }, [profileId, router]);

  const query = useQuery(
    trpc.recommendation.crops.queryOptions(
      { fieldProfileId: profileId ?? "" },
      { enabled: Boolean(profileId), retry: false, staleTime: Infinity },
    ),
  );

  const [picked, setPicked] = useState<CropId | null>(null);
  const top = query.data?.result.top ?? [];
  const selected = picked ?? top[0]?.cropId ?? null;

  const continueHref =
    query.data && selected
      ? wizardPath("soi", {
          profile: profileId,
          recommendation: query.data.id,
          crop: selected,
        })
      : null;

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

        {query.isPending && profileId && <RecommendationSkeleton />}

        {query.isError && (
          <RetryScreen
            title={s.recommendation.retryTitle}
            description={
              query.error.message === "WEATHER_UNAVAILABLE"
                ? s.recommendation.retry
                : s.recommendation.retryAi
            }
            action={s.recommendation.retryAction}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        )}

        {query.data && (
          <>
            <ul className="mt-5 flex flex-col gap-3">
              {top.map((crop, index) => (
                <li key={crop.cropId}>
                  <CropCard
                    crop={crop}
                    recommended={index === 0}
                    selected={crop.cropId === selected}
                    onSelect={() => setPicked(crop.cropId)}
                    locale={locale}
                  />
                </li>
              ))}
            </ul>

            {query.data.result.excluded.length > 0 && (
              <Collapsible className="mt-5">
                <CollapsibleTrigger className="text-subtle hover:text-foreground flex w-full items-center justify-between py-2 text-left text-[15.5px] font-semibold [&[data-state=open]>svg]:rotate-180">
                  {s.recommendation.others}
                  <ChevronDown
                    className="size-4 transition-transform"
                    aria-hidden
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-faint mb-2 text-[13.5px]">
                    {s.recommendation.excluded}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {query.data.result.excluded.map((item) => (
                      <li
                        key={item.cropId}
                        className="border-input rounded-[var(--radius-lg)] border px-4 py-3"
                      >
                        <span className="block text-[15.5px] font-semibold">
                          {cropDisplayName(item.cropId, locale)}
                        </span>
                        <span className="text-subtle block text-[14px] leading-[1.4]">
                          {item.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </Screen>
      <StickyBar>
        {continueHref ? (
          <PrimaryCta asChild>
            <Link href={continueHref}>{t.agro.wizard.continue}</Link>
          </PrimaryCta>
        ) : (
          <PrimaryCta disabled>{t.agro.wizard.continue}</PrimaryCta>
        )}
      </StickyBar>
    </>
  );
}

function CropCard({
  crop,
  recommended,
  selected,
  onSelect,
  locale,
}: {
  crop: RecommendedCrop;
  recommended: boolean;
  selected: boolean;
  onSelect: () => void;
  locale: "ro" | "en";
}) {
  const { t } = useLanguage();
  const s = t.agro.cultura;
  const Icon = GROUP_ICONS[getCrop(crop.cropId).group] ?? Sprout;
  const window = fill(s.recommendation.window, {
    from: formatShortDate(crop.sowingWindow.from, locale),
    to: formatShortDate(crop.sowingWindow.to, locale),
  });

  return (
    <ChoiceCard
      selected={selected}
      onSelect={onSelect}
      className="flex items-start gap-3.5"
    >
      <span
        className={cn(
          "bg-secondary text-brand grid size-[46px] shrink-0 place-items-center rounded-xl",
          selected && "bg-card",
        )}
      >
        <Icon className="size-6" />
      </span>
      <span className="flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="block text-[19px] font-semibold">
            {cropDisplayName(crop.cropId, locale)}
          </span>
          <span className="text-brand shrink-0 text-[15px] font-bold">
            {fill(s.recommendation.fit, { n: crop.fit })}
          </span>
        </span>
        <span className="text-subtle mt-0.5 block text-[14.5px]">{window}</span>
        <RecommendationReasons
          reasons={crop.reasons.slice(0, 2)}
          risks={crop.risks}
        />
        <span className="mt-2.5 flex flex-wrap gap-2">
          {recommended && <SuccessBadge>{s.recommended}</SuccessBadge>}
          <FactBadge>{s.recommendation.confidence[crop.confidence]}</FactBadge>
        </span>
      </span>
    </ChoiceCard>
  );
}
