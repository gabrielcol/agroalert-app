"use client";

import Timeline, {
  type TimelineEntry,
} from "@/components/shadcn-studio/blocks/timeline-component-02/timeline-component-02";
import { stageDates, stageOffsets } from "@/lib/agro/crop-calendar";
import { fill, formatLongDate } from "@/lib/agro/recommendation-ui";
import { useLanguage } from "@/lib/i18n/provider";

/**
 * The Crop Calendar as a timeline (CONTEXT.md "Crop Calendar", "Stage",
 * "Sowing Date"): one node per Stage, badged with its offset from the
 * previous one. Without a Sowing Date every node is dimmed and the first one
 * says how to set it; with one, each Stage shows its calendar date.
 */
export function CropTimeline({ sownAt }: { sownAt: Date | null }) {
  const { t, locale } = useLanguage();
  const c = t.agro.rezumat.calendar;

  const stages = sownAt
    ? stageDates(sownAt)
    : stageOffsets().map((stage) => ({ ...stage, date: null }));

  const data: TimelineEntry[] = stages.map((stage, index) => {
    const row = c.rows[stage.id];
    const offset =
      index === 0
        ? c.dayZero
        : fill(c.dayOffset, {
            n: stage.offsetDays - stages[index - 1]!.offsetDays,
          });
    const note =
      index === 0
        ? sownAt
          ? fill(c.sownOn, { date: formatLongDate(sownAt, locale) })
          : c.hint
        : stage.date
          ? formatLongDate(stage.date, locale)
          : null;

    return {
      title: offset,
      content: (
        <div>
          <p className="text-[16.5px] font-medium">{row.title}</p>
          <p className="text-subtle mt-0.5 text-sm">{row.sub}</p>
          {note && (
            <p className="text-brand mt-1 text-sm font-medium">{note}</p>
          )}
        </div>
      ),
    };
  });

  return <Timeline data={data} dimmed={!sownAt} />;
}
