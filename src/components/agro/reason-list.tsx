import {
  CalendarRange,
  CloudSun,
  Layers,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The three always-present reasons behind a suggested Crop or Variety, plus an
 * optional caution. Copy lives in the dictionaries (`t.agro.*.reasons`).
 */
export type Reasons = {
  soil: string;
  window: string;
  weather: string;
  caution?: string;
};

/**
 * Why an option is suggested: soil fit, sowing window, weather fit, and — only
 * where the option carries a risk — a muted caution line.
 *
 * Renders `<span>` and `<svg>` only: this list sits inside `ChoiceCard`, which
 * is a `<button>`, so its children must stay phrasing content (a `<div>`,
 * `<ul>` or `<p>` in there is invalid HTML and the browser will re-parent it).
 */
export function ReasonList({
  reasons,
  className,
}: {
  reasons: Reasons;
  className?: string;
}) {
  return (
    <span className={cn("mt-2 flex flex-col gap-1", className)}>
      <ReasonRow icon={Layers} text={reasons.soil} />
      <ReasonRow icon={CalendarRange} text={reasons.window} />
      <ReasonRow icon={CloudSun} text={reasons.weather} />
      {reasons.caution && (
        <ReasonRow icon={TriangleAlert} text={reasons.caution} caution />
      )}
    </span>
  );
}

function ReasonRow({
  icon: Icon,
  text,
  caution,
}: {
  icon: LucideIcon;
  text: string;
  caution?: boolean;
}) {
  return (
    <span
      className={cn(
        "text-subtle flex items-start gap-2 text-[14.5px] leading-[1.4]",
        caution && "text-faint",
      )}
    >
      <Icon className="mt-[3px] size-[15px] shrink-0" aria-hidden />
      <span>{text}</span>
    </span>
  );
}
