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
const crops = vi.fn();

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

beforeEach(() => {
  push.mockReset();
  geocode.mockReset().mockResolvedValue([MATCH]);
  createProfile
    .mockReset()
    .mockImplementation(async (input: object) => ({ id: "fp_1", ...input }));
  crops.mockReset().mockResolvedValue({ id: "stub_fp_1" });
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

  it("offers a retry when the recommendation fails, without recreating the profile", async () => {
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
    await user.click(retry);

    await waitFor(() => expect(crops).toHaveBeenCalledTimes(2));
    expect(createProfile).toHaveBeenCalledTimes(1);
    expect(geocode).toHaveBeenCalledTimes(1);
  });
});
