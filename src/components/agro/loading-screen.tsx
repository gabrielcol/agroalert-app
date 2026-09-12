"use client";

import { useEffect, useState } from "react";
import {
  CalendarRange,
  Check,
  CloudSun,
  History,
  ListChecks,
  LoaderCircle,
  Sprout,
  type LucideIcon,
} from "lucide-react";

import { LOADING_STEPS, type LoadingStep } from "@/lib/agro/mock-data";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const ICONS: Record<LoadingStep, LucideIcon> = {
  history: History,
  forecast: CloudSun,
  crops: Sprout,
  windows: CalendarRange,
  list: ListChecks,
};

const START_DELAY_MS = 300;
const STEP_MS = 650;
const DONE_DELAY_MS = 400;

/**
 * Staged "preparing your recommendation" screen. Purely cosmetic: it walks
 * the five steps on a timer and calls `onDone` when the last one completes.
 */
export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const t = useT();
  // Number of steps that have started; step i is "done" once i+1 has started.
  const [started, setStarted] = useState(0);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    LOADING_STEPS.forEach((_, i) => {
      timers.push(
        setTimeout(() => setStarted(i + 1), START_DELAY_MS + i * STEP_MS),
      );
    });
    const total = START_DELAY_MS + LOADING_STEPS.length * STEP_MS;
    timers.push(setTimeout(() => setStarted(LOADING_STEPS.length + 1), total));
    timers.push(setTimeout(onDone, total + DONE_DELAY_MS));
    const dotTimer = setInterval(() => setDots((n) => (n % 3) + 1), 450);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(dotTimer);
    };
  }, [onDone]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7 px-5 text-center">
      <LoaderCircle
        className="text-brand size-16 animate-spin [animation-duration:2.2s]"
        aria-hidden="true"
      />
      {/* Only the title is announced; the dots and step ticks are cosmetic. */}
      <div role="status" aria-live="polite">
        <h1 className="text-[19px] leading-[1.25] font-semibold tracking-[-0.03em]">
          {t.agro.loading.title}
        </h1>
        <p className="text-muted-foreground mt-2 text-[17.5px]">
          {t.agro.loading.subtitle}
          <span className="inline-block w-[1.2em] text-left" aria-hidden="true">
            {".".repeat(dots)}
          </span>
        </p>
      </div>
      <ol
        className="flex w-full max-w-[300px] flex-col gap-3.5 text-left"
        aria-hidden="true"
      >
        {LOADING_STEPS.map((id, i) => {
          const Icon = ICONS[id];
          const done = started > i + 1;
          const active = started === i + 1;
          return (
            <li
              key={id}
              className={cn(
                "text-faint flex items-center gap-3 text-[16.5px] transition-colors",
                active && "text-foreground",
                done && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "bg-secondary text-faint grid size-[26px] shrink-0 place-items-center rounded-full transition-colors",
                  active && "bg-accent text-brand",
                  done && "bg-success-subtle text-success",
                )}
              >
                {done ? (
                  <Check className="size-[13px]" />
                ) : (
                  <Icon className="size-[13px]" />
                )}
              </span>
              <span>{t.agro.loading.steps[id]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
