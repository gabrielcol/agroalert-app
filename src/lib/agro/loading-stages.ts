/**
 * Progress model for the staged loading screen. `started` counts stages that
 * have begun (1-based): stage i (0-based) is active when started === i + 1
 * and done once started > i + 1. `total + 1` means every stage is done.
 *
 * Stage 1 ("Găsim terenul") is real: it stays active until the Field
 * Location resolves. The remaining stages tick forward on a timer while the
 * recommendation call is pending, but never past the last stage; when the
 * call settles every stage completes at once.
 */
export function nextStarted(
  started: number,
  {
    locationDone,
    settled,
    total,
  }: { locationDone: boolean; settled: boolean; total: number },
): number {
  if (settled) return total + 1;
  if (!locationDone) return Math.max(started, 1);
  return Math.min(Math.max(started + 1, 2), total);
}

export type StageState = "pending" | "active" | "done";

export function stageState(started: number, index: number): StageState {
  if (started > index + 1) return "done";
  if (started === index + 1) return "active";
  return "pending";
}
