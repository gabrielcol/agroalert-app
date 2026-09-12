"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Check,
  CloudSun,
  History,
  LoaderCircle,
  MapPin,
  Sprout,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { allDone, stepProgress } from "@/lib/agro/loading-stages";
import { LOADING_STEPS, type LoadingStep } from "@/lib/agro/mock-data";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const ICONS: Record<LoadingStep, LucideIcon> = {
  location: MapPin,
  history: History,
  forecast: CloudSun,
  recommendation: Sprout,
};

/** Minimum time a step stays on screen, so a warm cache does not flash past. */
const DWELL_MS = 350;
const DONE_DELAY_MS = 400;
const FADE_S = 0.22;
const RISE_PX = 10;

export type LoadingScreenProps = {
  /**
   * How many of the four calls have resolved (0…4), raised by the caller in
   * order: geocoding, the climate pull, the forecast pull, the model.
   */
  completed: number;
  /** Something failed; the step freezes and a retry is offered. */
  error?: boolean;
  onRetry?: () => void;
  /** Called once, shortly after the last step completes. */
  onDone: () => void;
};

/**
 * "Preparing your recommendation": one step on screen at a time, each one
 * waiting on its own call. The step advances only once that call has come
 * back (after a short dwell) and crossfades vertically into the next one.
 * See `loading-stages.ts` for the model.
 */
export function LoadingScreen({
  completed,
  error = false,
  onRetry,
  onDone,
}: LoadingScreenProps) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0);
  const [dots, setDots] = useState(1);
  const total = LOADING_STEPS.length;
  const { index, state } = stepProgress(shown, completed, total);
  const finished = allDone(shown, completed, total);
  // True for as long as the step on screen is waiting on the next one; the
  // dwell timer is keyed on this rather than on `completed` so a burst of
  // cache hits does not keep restarting it.
  const canAdvance = !error && completed > shown && shown < total - 1;
  // The step that was in flight when it failed: what a failure freezes on,
  // even if the dwell had not caught up with it yet.
  const frozenAt = Math.min(completed, total - 1);

  useEffect(() => {
    if (!canAdvance) return;
    const timer = setTimeout(() => setShown((s) => s + 1), DWELL_MS);
    return () => clearTimeout(timer);
  }, [canAdvance, shown]);

  useEffect(() => {
    if (!error || shown >= frozenAt) return;
    const timer = setTimeout(() => setShown(frozenAt), 0);
    return () => clearTimeout(timer);
  }, [error, shown, frozenAt]);

  useEffect(() => {
    if (!finished || error) return;
    const timer = setTimeout(onDone, DONE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [finished, error, onDone]);

  useEffect(() => {
    const dotTimer = setInterval(() => setDots((n) => (n % 3) + 1), 450);
    return () => clearInterval(dotTimer);
  }, []);

  const id = LOADING_STEPS[index];
  const Icon = ICONS[id];
  const done = state === "done";
  // Reduced motion keeps the crossfade but drops the vertical travel.
  const rise = reduceMotion ? 0 : RISE_PX;

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
      {/* Only the title is announced here; the dots are cosmetic. */}
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
      {/* Fixed height: the step swaps inside it, the layout never jumps. */}
      <div
        className="flex h-[34px] w-full max-w-[300px] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={id}
            data-stage={id}
            data-state={state}
            initial={{ opacity: 0, y: rise }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -rise }}
            transition={{ duration: FADE_S, ease: "easeOut" }}
            className={cn(
              "flex items-center gap-3 text-[16.5px]",
              done ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <span
              className={cn(
                "grid size-[26px] shrink-0 place-items-center rounded-full transition-colors",
                done
                  ? "bg-success-subtle text-success"
                  : "bg-accent text-brand",
              )}
            >
              {done ? (
                <Check className="size-[13px]" />
              ) : (
                <Icon className="size-[13px]" />
              )}
            </span>
            <span>{t.agro.loading.steps[id]}</span>
          </motion.div>
        </AnimatePresence>
      </div>
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
