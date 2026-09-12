import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/lib/i18n/provider";

import { CropTimeline } from "./crop-timeline";

// The vendor block drives a scroll animation with motion/react; jsdom has no
// layout, so it is replaced by a plain list that echoes the entries.
vi.mock(
  "@/components/shadcn-studio/blocks/timeline-component-02/timeline-component-02",
  () => ({
    default: ({
      data,
      dimmed,
    }: {
      data: { title: string; content: React.ReactNode }[];
      dimmed?: boolean;
    }) => (
      <ol data-dimmed={dimmed ? "true" : "false"}>
        {data.map((entry) => (
          <li key={entry.title}>
            <b>{entry.title}</b>
            {entry.content}
          </li>
        ))}
      </ol>
    ),
  }),
);

function renderTimeline(sownAt: Date | null) {
  return render(
    <LanguageProvider>
      <CropTimeline sownAt={sownAt} />
    </LanguageProvider>,
  );
}

describe("CropTimeline", () => {
  it("lists the five Stages with their offset from the previous one", () => {
    renderTimeline(null);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    for (const badge of [
      "Ziua 0",
      "+10 zile",
      "+150 zile",
      "+60 zile",
      "+50 zile",
    ]) {
      expect(screen.getByText(badge)).toBeInTheDocument();
    }
    expect(screen.getByText("Semănat")).toBeInTheDocument();
    expect(screen.getByText("Recoltare")).toBeInTheDocument();
  });

  it("is dimmed with a hint on the first node before the Sowing Date", () => {
    renderTimeline(null);
    expect(screen.getByRole("list")).toHaveAttribute("data-dimmed", "true");
    expect(
      screen.getByText(/Apasă „Marchează semănat” mai jos/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument();
  });

  it("shows the Sowing Date and every Stage's calendar date once sown", () => {
    renderTimeline(new Date(2026, 8, 12, 9, 0));
    expect(screen.getByRole("list")).toHaveAttribute("data-dimmed", "false");
    expect(
      screen.getByText("Semănat pe 12 septembrie 2026"),
    ).toBeInTheDocument();
    expect(screen.getByText("22 septembrie 2026")).toBeInTheDocument(); // +10
    expect(screen.getByText("9 iunie 2027")).toBeInTheDocument(); // +270
  });
});
