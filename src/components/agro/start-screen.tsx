"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import { useT } from "@/lib/i18n/provider";

/** How long the mock progress bar takes to fill. */
export const DURATION_MS = 2000;
/** Reduced motion: the bar is filled almost at once. */
export const REDUCED_DURATION_MS = 600;
/** Beat between the bar reaching 100% and handing over to the dashboard. */
export const HANDOVER_MS = 250;

// Taken from the artwork rather than the theme tokens: the splash is the one
// surface that keeps the brand's forest green in both themes, and `--brand`
// is a lighter green tuned for text and glyphs on the app background.
const FOREST = "#1F4D2A";
const CREAM = "#F5F0E4";
const AMBER = "#E8A33C";

/**
 * The start screen: the cream lockup on the brand forest green with a mock
 * progress bar that fills over ~2s, then hands over to the dashboard. Purely
 * time-driven — nothing is being loaded. The call-driven loader for the wizard
 * is `loading-screen.tsx`.
 */
export function StartScreen({ onDone }: { onDone: () => void }) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? REDUCED_DURATION_MS : DURATION_MS;

  useEffect(() => {
    const timer = setTimeout(onDone, duration + HANDOVER_MS);
    return () => clearTimeout(timer);
  }, [duration, onDone]);

  return (
    <div
      data-testid="start-screen"
      className="flex flex-1 flex-col items-center justify-center gap-10 px-8"
      style={{ backgroundColor: FOREST }}
    >
      <Image
        src="/logos/logo-dark-600.png"
        alt={t.app.name}
        width={600}
        height={227}
        preload
        className="h-auto w-[70%] max-w-[300px]"
      />
      <div className="flex w-[70%] max-w-[300px] flex-col items-center">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: `${CREAM}33` }}
          aria-hidden="true"
        >
          <motion.div
            data-testid="start-progress"
            className="h-full rounded-full"
            style={{ backgroundColor: AMBER }}
            initial={{ width: reduceMotion ? "100%" : "0%" }}
            animate={{ width: "100%" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: duration / 1000, ease: "easeInOut" }
            }
          />
        </div>
        <p
          role="status"
          aria-live="polite"
          className="mt-5 text-center text-[15px]"
          style={{ color: `${CREAM}CC` }}
        >
          {t.agro.splash.loading}
        </p>
      </div>
    </div>
  );
}
