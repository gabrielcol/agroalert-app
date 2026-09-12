"use client";

import { useEffect, useState } from "react";
import {
  CalendarRange,
  Check,
  CloudSun,
  History,
  ListChecks,
  LoaderCircle,
  MapPin,
  Sprout,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { nextStarted, stageState } from "@/lib/agro/loading-stages";
import { LOADING_STEPS, type LoadingStep } from "@/lib/agro/mock-data";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const ICONS: Record<LoadingStep, LucideIcon> = {
  location: MapPin,
  history: History,
  forecast: CloudSun,
  crops: Sprout,
  windows: CalendarRange,
  list: ListChecks,
};

const START_DELAY_MS = 300;
const STEP_MS = 650;
const DONE_DELAY_MS = 400;

export type LoadingScreenProps = {
  /** The Field Location has resolved: stage 1 is done. */
  locationDone: boolean;
  /** The recommendation call has settled successfully: every stage completes. */
  settled: boolean;
  /** Something failed; the stages freeze and a retry is offered. */
  error?: boolean;
  onRetry?: () => void;
  /** Called once, shortly after the last stage completes. */
  onDone: () => void;
};

/**
 * Staged "preparing your recommendation" screen. The first stage is real
 * (it waits for the Field Location); the others tick on a timer while the
 * recommendation is pending, stop on the last one, and all complete once
 * the call settles. See `loading-stages.ts` for the progression rules.
 */
export function LoadingScreen({
  locationDone,
  settled,
  error = false,
  onRetry,
  onDone,
}: LoadingScreenProps) {
  const t = useT();
  const [started, setStarted] = useState(0);
  const [dots, setDots] = useState(1);
  const total = LOADING_STEPS.length;
  const allDone = started > total;

  useEffect(() => {
    if (error || allDone) return;
    const delay = started === 0 ? START_DELAY_MS : STEP_MS;
    const timer = setTimeout(() => {
      setStarted((s) => nextStarted(s, { locationDone, settled, total }));
    }, delay);
    return () => clearTimeout(timer);
  }, [started, locationDone, settled, error, allDone, total]);

  useEffect(() => {
    if (!allDone) return;
    const timer = setTimeout(onDone, DONE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [allDone, onDone]);

  useEffect(() => {
    const dotTimer = setInterval(() => setDots((n) => (n % 3) + 1), 450);
    return () => clearInterval(dotTimer);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7 px-5 text-center">
      {error ? (
        <TriangleAlert
          className="text-destructive size-16"
          aria-hidden="true"
        />
      ) : (
        <LoaderCircle
          className="text-brand size-16 animate-spin [animation-duration:2.2s]"
          aria-hidden="true"
        />
      )}
      {/* Only the title is announced; the dots and step ticks are cosmetic. */}
      <div role="status" aria-live="polite">
        <h1 className="text-[19px] leading-[1.25] font-semibold tracking-[-0.03em]">
          {error ? t.agro.loading.error : t.agro.loading.title}
        </h1>
        {!error && (
          <p className="text-muted-foreground mt-2 text-[17.5px]">
            {t.agro.loading.subtitle}
            <span
              className="inline-block w-[1.2em] text-left"
              aria-hidden="true"
            >
              {".".repeat(dots)}
            </span>
          </p>
        )}
      </div>
      <ol
        className="flex w-full max-w-[300px] flex-col gap-3.5 text-left"
        aria-hidden="true"
      >
        {LOADING_STEPS.map((id, i) => {
          const Icon = ICONS[id];
          const state = stageState(started, i);
          const done = state === "done";
          const active = state === "active";
          return (
            <li
              key={id}
              data-stage={id}
              data-state={state}
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
      {error && onRetry && (
        <Button
          type="button"
          size="lg"
          onClick={onRetry}
          className="h-[52px] rounded-[var(--radius-md)] px-8 text-[17px]"
        >
          {t.agro.loading.retry}
        </Button>
      )}
    </div>
  );
}
