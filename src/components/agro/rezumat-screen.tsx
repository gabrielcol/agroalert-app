"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CalendarRange,
  CircleCheck,
  CloudRain,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChannelOptions } from "@/components/agro/channel-options";
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
import {
  ALERTS,
  ALERT_TONE,
  CALENDAR_ROWS,
  DEFAULT_CHANNEL,
  type AlertId,
  type ChannelId,
} from "@/lib/agro/mock-data";
import { DASHBOARD_PATH, previousStepPath } from "@/lib/agro/plan-steps";
import { useT } from "@/lib/i18n/provider";

const STEP = "rezumat";

const ALERT_ICONS: Record<AlertId, LucideIcon> = {
  drought: TriangleAlert,
  rain: CloudRain,
  anm: CircleCheck,
};

/** Step 4: the sowing plan (window, calendar, alerts) + channel; activate. */
export function RezumatScreen() {
  const t = useT();
  const s = t.agro.rezumat;
  const [channel, setChannel] = useState<ChannelId>(DEFAULT_CHANNEL);
  const [activated, setActivated] = useState(false);

  return (
    <>
      <PhoneHeader
        backHref={previousStepPath(STEP)}
        title={s.header}
        step={STEP}
      />
      {activated ? (
        <DoneState channel={channel} />
      ) : (
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

          <PlanCard icon={Bell} title={s.channel.title}>
            <ChannelOptions value={channel} onChange={setChannel} />
          </PlanCard>

          <PrimaryCta className="mt-5" onClick={() => setActivated(true)}>
            {s.activate}
          </PrimaryCta>
        </Screen>
      )}
    </>
  );
}

function DoneState({ channel }: { channel: ChannelId }) {
  const t = useT();
  const d = t.agro.done;
  return (
    <Screen className="items-center justify-center gap-4 text-center">
      <span className="bg-success-subtle text-success grid size-[60px] place-items-center rounded-full">
        <CircleCheck className="size-7" />
      </span>
      <h1 className="text-xl leading-[1.25] font-semibold tracking-[-0.03em]">
        {d.title}
      </h1>
      <p className="text-muted-foreground text-[17.5px] leading-[1.55]">
        {d.body.replace("{channel}", d.channel[channel])}
      </p>
      <Button asChild size="lg" className="mt-2 h-[50px] px-6 text-base">
        <Link href={DASHBOARD_PATH}>{d.back}</Link>
      </Button>
    </Screen>
  );
}
