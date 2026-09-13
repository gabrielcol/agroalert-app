import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/lib/i18n/provider";

import { SoiScreen } from "./soi-screen";

// Issue 0021: with a wizard param missing the varieties query is disabled, so
// nothing was in flight and nothing rendered — a truly blank screen. The screen
// now always shows the not-ready notice with a way back.
//
// Issue 0022: the varieties model call takes tens of seconds, so the step has
// to say so while it runs. Copy is asserted in the default locale (ro).

let search = "profile=fp1&rec=rec1&crop=grau_toamna";
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => "/plan/soi",
}));

const varieties = vi.fn();

vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    recommendation: {
      varieties: {
        queryKey: (input: unknown) => ["recommendation.varieties", input],
        queryOptions: (input: unknown, opts: object) => ({
          queryKey: ["recommendation.varieties", input],
          queryFn: () => varieties(input),
          ...opts,
        }),
      },
    },
  }),
}));

const RANKING = {
  id: "var_1",
  cropRecommendationId: "rec1",
  cropId: "grau_toamna",
  result: {
    cropId: "grau_toamna",
    ranked: [
      { varietyName: "Glosa", fit: 90, reasons: ["Tolerantă la secetă."] },
      { varietyName: "Izvor", fit: 84, reasons: ["Rezistent la iernare."] },
    ],
  },
  modelId: "claude-sonnet-5",
  createdAt: new Date("2026-09-13T10:00:00.000Z"),
};

const LOADING = "Se încarcă soiurile…";

/** A promise the test resolves by hand, so "pending" is observable. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <SoiScreen />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  search = "profile=fp1&rec=rec1&crop=grau_toamna";
  replace.mockReset();
  varieties.mockReset().mockResolvedValue({
    result: { cropId: "grau_toamna", ranked: [] },
    aiCallId: null,
  });
});

describe("SoiScreen without the wizard params", () => {
  it("shows a visible notice and a way back instead of a blank area", () => {
    search = "";
    renderScreen();

    const notice = screen.getByTestId("soi-not-ready");
    expect(notice).toBeVisible();
    expect(notice).toHaveTextContent("Ne lipsesc câteva date");
    // No parcel either, so the way back is the first step of the wizard.
    expect(
      screen.getByRole("link", { name: "Înapoi la pasul anterior" }),
    ).toHaveAttribute("href", "/plan/teren");
    expect(varieties).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/plan/teren");
  });

  it("points back at the crop step when only the crop is missing", () => {
    search = "profile=fp1&rec=rec1";
    renderScreen();

    expect(screen.getByTestId("soi-not-ready")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Înapoi la pasul anterior" }),
    ).toHaveAttribute("href", "/plan/cultura?profile=fp1");
    expect(varieties).not.toHaveBeenCalled();
  });

  it("does not show the notice once every param is present", () => {
    renderScreen();
    expect(screen.queryByTestId("soi-not-ready")).not.toBeInTheDocument();
  });
});

describe("SoiScreen loading state", () => {
  it("announces the wait and shows placeholders while the call is in flight", async () => {
    const call = deferred<typeof RANKING>();
    varieties.mockReturnValue(call.promise);
    renderScreen();

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(LOADING);
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    // Nothing is selectable yet.
    expect(screen.queryByRole("button", { pressed: true })).toBeNull();

    call.resolve(RANKING);

    expect(
      await screen.findByRole("button", { name: /Glosa/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).toBeNull();
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it("clears the loading state and shows the retry screen when the call fails", async () => {
    varieties.mockRejectedValue(new Error("AI_UNAVAILABLE"));
    renderScreen();

    expect(
      await screen.findByText(
        "Nu am putut pregăti recomandarea. Încearcă din nou.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LOADING)).toBeNull());
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });
});
