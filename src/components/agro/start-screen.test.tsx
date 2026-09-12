import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/lib/i18n/provider";

import { DURATION_MS, HANDOVER_MS, StartScreen } from "./start-screen";

describe("StartScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the lockup and the announced loading line", () => {
    render(
      <LanguageProvider>
        <StartScreen onDone={() => {}} />
      </LanguageProvider>,
    );
    expect(screen.getByRole("img", { name: "AgroPlan" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("hands over exactly once, after the mock progress completes", () => {
    const onDone = vi.fn();
    render(
      <LanguageProvider>
        <StartScreen onDone={onDone} />
      </LanguageProvider>,
    );

    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(DURATION_MS + HANDOVER_MS - 1);
    expect(onDone).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDone).toHaveBeenCalledTimes(1);

    // Nothing fires a second time once the dashboard has taken over.
    vi.advanceTimersByTime(DURATION_MS * 3);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
