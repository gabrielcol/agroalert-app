"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  CalendarRange,
  CircleCheck,
  CloudRain,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CropTimeline } from "@/components/agro/crop-timeline";
import { PhoneHeader } from "@/components/agro/phone-header";
import { Screen } from "@/components/agro/phone-shell";
import { AlertRow, PlanCard, WindowBox } from "@/components/agro/plan-card";
import { PrimaryCta } from "@/components/agro/primary-cta";
import { StepHeading } from "@/components/agro/step-heading";
import { StickyBar } from "@/components/agro/sticky-bar";
import { ALERTS, ALERT_TONE, type AlertId } from "@/lib/agro/mock-data";
import { DASHBOARD_PATH, previousStepPath } from "@/lib/agro/plan-steps";
import {
  WIZARD_PARAMS,
  cropDisplayName,
  cropIdFromParam,
  fill,
  formatLongDate,
} from "@/lib/agro/recommendation-ui";
import { addSowingPlanId } from "@/lib/agro/sowing-plan-storage";
import { useLanguage } from "@/lib/i18n/provider";
import { useTRPC } from "@/trpc/client";

const STEP = "rezumat";

const ALERT_ICONS: Record<AlertId, LucideIcon> = {
  drought: TriangleAlert,
  rain: CloudRain,
  anm: CircleCheck,
};

/**
 * Step 4: the plan (window, Crop Calendar timeline, alerts) and the moment a
 * Sowing Plan comes into existence: confirming "Sown today?" in the sticky
 * bar records the Sowing Date (issue 0008). Reads `?profile&crop&variety`;
 * without them the summary is read-only (no bar).
 */
export function RezumatScreen() {
  const { t, locale } = useLanguage();
  const s = t.agro.rezumat;
  const params = useSearchParams();
  const profileId = params.get(WIZARD_PARAMS.profile);
  const cropId = cropIdFromParam(params.get(WIZARD_PARAMS.crop));
  const variety = params.get(WIZARD_PARAMS.variety);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const title = cropId
    ? [cropDisplayName(cropId, locale), variety].filter(Boolean).join(" · ")
    : s.title;

  const planQuery = useQuery(
    trpc.sowingPlan.latestByProfile.queryOptions(
      { fieldProfileId: profileId ?? "" },
      { enabled: Boolean(profileId), staleTime: Infinity },
    ),
  );
  const plan = planQuery.data ?? null;

  const markSown = useMutation(trpc.sowingPlan.markSown.mutationOptions());
  const [confirming, setConfirming] = useState(false);
  // One Sowing Plan per confirmation, even under a double tap.
  const sownRef = useRef(false);

  const confirm = useCallback(async () => {
    if (!profileId || !cropId || sownRef.current) return;
    sownRef.current = true;
    try {
      const created = await markSown.mutateAsync({
        fieldProfileId: profileId,
        cropId,
        varietyName: variety ?? undefined,
      });
      addSowingPlanId(created.id);
      queryClient.setQueryData(
        trpc.sowingPlan.latestByProfile.queryKey({ fieldProfileId: profileId }),
        created,
      );
      setConfirming(false);
      toast.success(
        fill(s.sown.toastTitle, {
          date: formatLongDate(created.sownAt, locale),
        }),
        { description: s.sown.toastBody },
      );
    } catch {
      sownRef.current = false;
      toast.error(s.sown.error);
    }
  }, [cropId, locale, markSown, profileId, queryClient, s.sown, trpc, variety]);

  const canSow = Boolean(profileId && cropId);

  return (
    <>
      <PhoneHeader
        backHref={previousStepPath(STEP)}
        title={s.header}
        step={STEP}
      />
      <Screen className="pt-[22px]">
        <StepHeading step={STEP} title={title} subtitle={s.subtitle} compact />

        <PlanCard icon={CalendarDays} title={s.when.title}>
          <WindowBox range={s.when.window} note={s.when.note} />
        </PlanCard>

        <PlanCard icon={CalendarRange} title={s.calendar.title}>
          <CropTimeline sownAt={plan?.sownAt ?? null} />
        </PlanCard>

        <PlanCard icon={Bell} title={s.alerts.title}>
          <p className="text-subtle mt-1 mb-2 text-[15.5px] leading-[1.5]">
            {s.alerts.intro}
          </p>
          {ALERTS.map((id) => (
            <AlertRow
              key={id}
              icon={ALERT_ICONS[id]}
              tone={ALERT_TONE[id]}
              {...s.alerts[id]}
            />
          ))}
        </PlanCard>
      </Screen>
      {/* The bar holds the one action of this screen (confirming the Sowing
          Date), then the way back to the dashboard. */}
      {canSow && (
        <StickyBar>
          {plan ? (
            <Button
              asChild
              variant="link"
              className="h-[60px] w-full text-[19px]"
            >
              <Link href={DASHBOARD_PATH}>{s.sown.back}</Link>
            </Button>
          ) : confirming ? (
            <>
              <p className="mb-2.5 text-center text-[17px] font-semibold">
                {s.sown.question}
              </p>
              <div className="flex gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-[52px] flex-1 rounded-[var(--radius-md)] text-[17px]"
                  disabled={markSown.isPending}
                  onClick={() => setConfirming(false)}
                >
                  {t.common.cancel}
                </Button>
                <PrimaryCta
                  className="h-[52px] flex-1 text-[17px]"
                  disabled={markSown.isPending}
                  onClick={() => void confirm()}
                >
                  {t.common.confirm}
                </PrimaryCta>
              </div>
            </>
          ) : (
            <PrimaryCta
              disabled={planQuery.isPending}
              onClick={() => setConfirming(true)}
            >
              {s.sown.cta}
            </PrimaryCta>
          )}
        </StickyBar>
      )}
    </>
  );
}
