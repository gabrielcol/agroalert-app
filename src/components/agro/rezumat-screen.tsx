"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CalendarRange,
  Check,
  CircleCheck,
  CloudRain,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PhoneHeader } from "@/components/agro/phone-header";
import { Screen } from "@/components/agro/phone-shell";
import {
  AlertRow,
  CalendarRow,
  PlanCard,
  WindowBox,
} from "@/components/agro/plan-card";
import { PrimaryCta } from "@/components/agro/primary-cta";
import { StepHeading } from "@/components/agro/step-heading";
import { StickyBar } from "@/components/agro/sticky-bar";
import {
  ALERTS,
  ALERT_TONE,
  CALENDAR_ROWS,
  type AlertId,
} from "@/lib/agro/mock-data";
import { DASHBOARD_PATH, previousStepPath } from "@/lib/agro/plan-steps";
import { useT } from "@/lib/i18n/provider";

const STEP = "rezumat";

const ALERT_ICONS: Record<AlertId, LucideIcon> = {
  drought: TriangleAlert,
  rain: CloudRain,
  anm: CircleCheck,
};

/**
 * Step 4: the sowing plan (window, calendar, alerts) and the alert
 * subscription. Subscribing is confirmed with a toast — how the alerts are
 * delivered is not part of the plan.
 */
export function RezumatScreen() {
  const t = useT();
  const s = t.agro.rezumat;
  const [subscribed, setSubscribed] = useState(false);

  return (
    <>
      <PhoneHeader
        backHref={previousStepPath(STEP)}
        title={s.header}
        step={STEP}
      />
      <Screen className="pt-[22px]">
        <StepHeading
          step={STEP}
          title={s.title}
          subtitle={s.subtitle}
          compact
        />

        <PlanCard icon={CalendarDays} title={s.when.title}>
          <WindowBox range={s.when.window} note={s.when.note} />
        </PlanCard>

        <PlanCard icon={CalendarRange} title={s.calendar.title}>
          {CALENDAR_ROWS.map((id) => (
            <CalendarRow key={id} {...s.calendar.rows[id]} />
          ))}
        </PlanCard>

        <PlanCard icon={Bell} title={s.alerts.title}>
          {ALERTS.map((id) => (
            <AlertRow
              key={id}
              icon={ALERT_ICONS[id]}
              tone={ALERT_TONE[id]}
              {...s.alerts[id]}
            />
          ))}
        </PlanCard>

        <PlanCard icon={Bell} title={s.subscribe.title}>
          <span className="text-subtle mt-1 block text-[15.5px] leading-[1.5]">
            {s.subscribe.body}
          </span>
        </PlanCard>
      </Screen>
      {/* The subscribe CTA leaves its card so it is reachable without
          scrolling past four plan cards. */}
      <StickyBar>
        <PrimaryCta
          disabled={subscribed}
          onClick={() => {
            setSubscribed(true);
            toast.success(s.subscribe.toast.title, {
              description: s.subscribe.toast.body,
            });
          }}
        >
          {subscribed ? (
            <>
              <Check className="size-5" />
              {s.subscribe.done}
            </>
          ) : (
            s.subscribe.cta
          )}
        </PrimaryCta>
        {subscribed && (
          <Button asChild variant="link" className="mt-1.5 w-full text-base">
            <Link href={DASHBOARD_PATH}>{s.subscribe.back}</Link>
          </Button>
        )}
      </StickyBar>
    </>
  );
}
