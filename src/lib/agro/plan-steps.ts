/**
 * The "add a crop" wizard: four steps, each its own route under /plan, framed
 * by the dashboard. This module is the single source of truth for step order
 * and the back/next targets the phone header and CTAs navigate to.
 */

export const PLAN_STEPS = ["teren", "cultura", "soi", "rezumat"] as const;
export type PlanStep = (typeof PLAN_STEPS)[number];

export const DASHBOARD_PATH = "/";

export function planStepPath(step: PlanStep): string {
  return `/plan/${step}`;
}

/** 1-based position, for the "Pasul n din 4" label and the progress dots. */
export function planStepIndex(step: PlanStep): number {
  return PLAN_STEPS.indexOf(step) + 1;
}

/**
 * Where the header back arrow goes. The first step returns to the dashboard;
 * so does the plan summary — once the plan is shown, leaving it means leaving
 * the wizard, not re-choosing a variety.
 */
export function previousStepPath(step: PlanStep): string {
  const index = PLAN_STEPS.indexOf(step);
  if (index <= 0 || step === "rezumat") return DASHBOARD_PATH;
  return planStepPath(PLAN_STEPS[index - 1]);
}

/** The step the primary CTA advances to, or null on the last step. */
export function nextStepPath(step: PlanStep): string | null {
  const next = PLAN_STEPS[PLAN_STEPS.indexOf(step) + 1];
  return next ? planStepPath(next) : null;
}
