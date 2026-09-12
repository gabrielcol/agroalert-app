import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/lib/i18n/provider";

import { TerenScreen, culturaPath } from "./teren-screen";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/plan/teren",
}));

const geocode = vi.fn();
const createProfile = vi.fn();
const climate = vi.fn();
const forecast = vi.fn();
const crops = vi.fn();
/** Every call the loading screen shows a step for, in the order it makes them. */
const order: string[] = [];

vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    geocode: {
      search: {
        queryOptions: (input: { query: string }) => ({
          queryKey: ["geocode", input],
          queryFn: () => geocode(input),
        }),
      },
    },
    fieldProfile: {
      create: {
        mutationOptions: () => ({
          mutationFn: (input: unknown) => createProfile(input),
        }),
      },
    },
    weather: {
      climate: {
        queryOptions: (input: { fieldProfileId: string }) => ({
          queryKey: ["weather.climate", input],
          queryFn: () => climate(input),
        }),
      },
      forecast: {
        queryOptions: (input: { fieldProfileId: string }) => ({
          queryKey: ["weather.forecast", input],
          queryFn: () => forecast(input),
        }),
      },
    },
    recommendation: {
      crops: {
        queryOptions: (input: { fieldProfileId: string }) => ({
          queryKey: ["crops", input],
          queryFn: () => crops(input),
        }),
      },
    },
  }),
}));

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <TerenScreen />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

const MATCH = {
  name: "Reviga, Comuna Reviga, Ialomița",
  lat: 44.68,
  lng: 27.1,
};

const CELL = { cellId: "44.6,27.1", refreshed: true };

beforeEach(() => {
  order.length = 0;
  push.mockReset();
  geocode.mockReset().mockImplementation(async () => {
    order.push("geocode.search");
    return [MATCH];
  });
  createProfile
    .mockReset()
    .mockImplementation(async (input: object) => ({ id: "fp_1", ...input }));
  climate.mockReset().mockImplementation(async () => {
    order.push("weather.climate");
    return CELL;
  });
  forecast.mockReset().mockImplementation(async () => {
    order.push("weather.forecast");
    return CELL;
  });
  crops.mockReset().mockImplementation(async () => {
    order.push("recommendation.crops");
    return { id: "stub_fp_1" };
  });
});

describe("TerenScreen", () => {
  it("defaults the Soil Class to unknown and the CTA waits for a village", () => {
    renderScreen();
    expect(screen.getByRole("radio", { name: "Nu știu" })).toHaveAttribute(
      "data-state",
      "on",
    );
    expect(screen.getByRole("button", { name: "Continuă" })).toBeDisabled();
  });

  it("geocodes the typed village, creates the profile and lands on cultura", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText("Sat / comună"), "Reviga");
    await user.click(screen.getByRole("radio", { name: "10+ ha" }));
    await user.click(screen.getByRole("radio", { name: "Da, am" }));
    await user.click(screen.getByRole("radio", { name: "Cernoziom" }));
    await user.click(screen.getByRole("button", { name: "Continuă" }));

    await waitFor(() => expect(createProfile).toHaveBeenCalledTimes(1));
    expect(geocode).toHaveBeenCalledWith({ query: "Reviga" });
    expect(createProfile).toHaveBeenCalledWith({
      lat: MATCH.lat,
      lng: MATCH.lng,
      villageName: "Reviga",
      landBucket: "large",
      irrigation: true,
      soilClass: "cernoziom",
    });
    await waitFor(() =>
      expect(crops).toHaveBeenCalledWith({ fieldProfileId: "fp_1" }),
    );
    await waitFor(
      () => expect(push).toHaveBeenCalledWith(culturaPath("fp_1")),
      {
        timeout: 6_000,
      },
    );
    expect(push).toHaveBeenCalledWith("/plan/cultura?profile=fp_1");
    // One real call per displayed step, in the order the steps are shown.
    expect(order).toEqual([
      "geocode.search",
      "weather.climate",
      "weather.forecast",
      "recommendation.crops",
    ]);
    expect(climate).toHaveBeenCalledWith({ fieldProfileId: "fp_1" });
    expect(forecast).toHaveBeenCalledWith({ fieldProfileId: "fp_1" });
  }, 10_000);

  it("shows the not-found message and stays on the form when nothing matches", async () => {
    geocode.mockResolvedValue([]);
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText("Sat / comună"), "Xyzzy");
    await user.click(screen.getByRole("button", { name: "Continuă" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nu am găsit localitatea",
    );
    expect(createProfile).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Sat / comună")).toHaveValue("Xyzzy");
  });

  it("uses the phone's position when the locate button is tapped", async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) =>
      ok({
        coords: { latitude: 45.1, longitude: 26.2 },
      } as GeolocationPosition),
    );
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: { getCurrentPosition },
    });
    const user = userEvent.setup();
    renderScreen();

    await user.click(
      screen.getByRole("button", { name: "Detectează automat locația" }),
    );
    expect(screen.getByLabelText("Sat / comună")).toHaveValue(
      "Locația curentă",
    );
    await user.click(screen.getByRole("button", { name: "Continuă" }));

    await waitFor(() => expect(createProfile).toHaveBeenCalledTimes(1));
    expect(geocode).not.toHaveBeenCalled();
    expect(createProfile.mock.calls[0]![0]).toMatchObject({
      lat: 45.1,
      lng: 26.2,
      villageName: "Locația curentă",
    });
    vi.unstubAllGlobals();
  });

  it("freezes on the failing step and offers a retry, without recreating the profile", async () => {
    crops
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue({ id: "ok" });
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText("Sat / comună"), "Reviga");
    await user.click(screen.getByRole("button", { name: "Continuă" }));

    const retry = await screen.findByRole("button", {
      name: "Încearcă din nou",
    });
    expect(
      screen.getByText("Nu am putut pregăti recomandarea."),
    ).toBeInTheDocument();
    // A single step is on screen and it is the one that failed.
    await waitFor(() => {
      const stages = document.querySelectorAll("[data-stage]");
      expect(stages).toHaveLength(1);
      expect(stages[0]!.getAttribute("data-stage")).toBe("recommendation");
    });
    await user.click(retry);

    await waitFor(() => expect(crops).toHaveBeenCalledTimes(2));
    expect(createProfile).toHaveBeenCalledTimes(1);
    expect(geocode).toHaveBeenCalledTimes(1);
  });
});
