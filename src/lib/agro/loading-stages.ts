import { LOADING_STEPS, type LoadingStep } from "./mock-data";

/**
 * Progress model for the loading screen. Nothing here is on a timer: the
 * screen advances only when a call has actually resolved (issue 0011).
 *
 * - `completed` — how many of the four calls have come back (0…total). The
 *   screen owner raises it as `geocode.search`, `weather.climate`,
 *   `weather.forecast` and `recommendation.crops` resolve, in that order.
 * - `shown` — the index of the step currently on screen. It follows
 *   `completed` one step at a time, after a short dwell, so a warm cache
 *   does not flash three steps past in one frame. It never runs ahead of
 *   `completed`, so a step is never shown as finished before it is.
 */

/** How many steps have been completed once `step`'s call has resolved. */
export function stepsThrough(step: LoadingStep): number {
  return LOADING_STEPS.indexOf(step) + 1;
}

/**
 * The next displayed step: one forward when its call has already resolved,
 * otherwise stay put. Stops on the last step.
 */
export function nextShown(
  shown: number,
  completed: number,
  total: number,
): number {
  const last = Math.max(total - 1, 0);
  if (shown >= last) return last;
  return completed > shown ? shown + 1 : shown;
}

export type StepState = "active" | "done";

/** The step on screen: which one, and whether its call has come back. */
export function stepProgress(
  shown: number,
  completed: number,
  total: number,
): { index: number; state: StepState } {
  const index = Math.min(Math.max(shown, 0), Math.max(total - 1, 0));
  return { index, state: completed > index ? "done" : "active" };
}

/** Every call has resolved and the last step has been shown as finished. */
export function allDone(
  shown: number,
  completed: number,
  total: number,
): boolean {
  return total > 0 && completed >= total && shown >= total - 1;
}
