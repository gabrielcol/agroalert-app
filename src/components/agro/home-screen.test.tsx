import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { START_SCREEN_SEEN_KEY } from "@/lib/agro/start-screen-storage";
import { LanguageProvider } from "@/lib/i18n/provider";

import { HomeScreen } from "./home-screen";
import { DURATION_MS, HANDOVER_MS } from "./start-screen";

// The real dashboard pulls tRPC and react-query; the handover is what this
// file is about, so a marker stands in for it.
vi.mock("@/components/agro/dashboard-screen", () => ({
  DashboardScreen: () => <div data-testid="dashboard-screen" />,
}));

function renderHome() {
  return render(
    <LanguageProvider>
      <HomeScreen />
    </LanguageProvider>,
  );
}

describe("HomeScreen", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.sessionStorage.clear();
  });

  it("plays the splash on the first visit of a browser session", () => {
    renderHome();

    expect(screen.getByTestId("start-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-screen")).not.toBeInTheDocument();
  });

  it("goes straight to the dashboard once the session has seen it", () => {
    window.sessionStorage.setItem(START_SCREEN_SEEN_KEY, "1");
    renderHome();

    expect(screen.getByTestId("dashboard-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("start-screen")).not.toBeInTheDocument();
  });

  it("marks the session as seen when the splash hands over", () => {
    renderHome();

    expect(window.sessionStorage.getItem(START_SCREEN_SEEN_KEY)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(DURATION_MS + HANDOVER_MS);
    });

    expect(window.sessionStorage.getItem(START_SCREEN_SEEN_KEY)).toBe("1");
    expect(screen.getByTestId("dashboard-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("start-screen")).not.toBeInTheDocument();
  });
});
