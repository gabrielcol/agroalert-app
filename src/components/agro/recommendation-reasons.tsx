import { CircleCheck, TriangleAlert, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Free-text reasons and risks from a Crop / Variety Recommendation. Unlike
 * `ReasonList` (three fixed slots), the model returns any number of short
 * Romanian sentences. Renders `<span>` and `<svg>` only so it can sit inside
 * `ChoiceCard`, which is a `<button>`.
 */
export function RecommendationReasons({
  reasons,
  risks = [],
  className,
}: {
  reasons: string[];
  risks?: string[];
  className?: string;
}) {
  return (
    <span className={cn("mt-2 flex flex-col gap-1", className)}>
      {reasons.map((text) => (
        <Line key={`r-${text}`} icon={CircleCheck} text={text} />
      ))}
      {risks.map((text) => (
        <Line key={`k-${text}`} icon={TriangleAlert} text={text} caution />
      ))}
    </span>
  );
}

function Line({
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
