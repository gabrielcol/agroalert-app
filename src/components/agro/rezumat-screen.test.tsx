import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/lib/i18n/provider";
import { SOWING_PLAN_IDS_KEY } from "@/lib/agro/sowing-plan-storage";

import { RezumatScreen } from "./rezumat-screen";

let search = "profile=fp1&crop=grau_toamna&variety=Glosa";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/plan/rezumat",
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

// The vendor block animates on window scroll; a plain list stands in for it.
vi.mock(
  "@/components/shadcn-studio/blocks/timeline-component-02/timeline-component-02",
  () => ({
    default: ({
      data,
    }: {
      data: { title: string; content: React.ReactNode }[];
    }) => (
      <ol>
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

const latestByProfile = vi.fn();
const markSown = vi.fn();

vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    sowingPlan: {
      latestByProfile: {
        queryKey: (input: unknown) => ["latestByProfile", input],
        queryOptions: (input: { fieldProfileId: string }, opts: object) => ({
          queryKey: ["latestByProfile", input],
          queryFn: () => latestByProfile(input),
          ...opts,
        }),
      },
      markSown: {
        mutationOptions: () => ({
          mutationFn: (input: unknown) => markSown(input),
        }),
      },
    },
  }),
}));

const PLAN = {
  id: "sp_1",
  fieldProfileId: "fp1",
  cropId: "grau_toamna",
  varietyName: "Glosa",
  sownAt: new Date(2026, 8, 12, 10, 0),
  createdAt: new Date(2026, 8, 12, 10, 0),
};

/** The CTA once the plan lookup has settled (it is disabled while pending). */
async function findCta() {
  const cta = await screen.findByRole("button", { name: "Marchează semănat" });
  await waitFor(() => expect(cta).toBeEnabled());
  return cta;
}

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <RezumatScreen />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  search = "profile=fp1&crop=grau_toamna&variety=Glosa";
  window.localStorage.clear();
  toastSuccess.mockReset();
  toastError.mockReset();
  latestByProfile.mockReset().mockResolvedValue(null);
  markSown.mockReset().mockResolvedValue(PLAN);
});

describe("RezumatScreen", () => {
  it("titles the plan from the crop and variety in the URL", async () => {
    renderScreen();
    expect(
      screen.getByRole("heading", { name: "Grâu de toamnă · Glosa" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alertele sunt active")).toBeInTheDocument();
    expect(screen.getByText("Ziua 0")).toBeInTheDocument();
    expect(await findCta()).toBeEnabled();
  });

  it("confirms inline, records the Sowing Date and offers the way back", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(await findCta());
    expect(screen.getByText("Ai semănat azi?")).toBeInTheDocument();

    // Cancel restores the CTA without touching the server.
    await user.click(screen.getByRole("button", { name: "Anulează" }));
    expect(
      screen.getByRole("button", { name: "Marchează semănat" }),
    ).toBeInTheDocument();
    expect(markSown).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Marchează semănat" }));
    await user.click(screen.getByRole("button", { name: "Confirmă" }));

    await waitFor(() => expect(markSown).toHaveBeenCalledTimes(1));
    expect(markSown).toHaveBeenCalledWith({
      fieldProfileId: "fp1",
      cropId: "grau_toamna",
      varietyName: "Glosa",
    });
    expect(
      await screen.findByRole("link", { name: "Înapoi la culturile tale" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByText("Semănat pe 12 septembrie 2026"),
    ).toBeInTheDocument();
    expect(toastSuccess).toHaveBeenCalledWith("Semănat pe 12 septembrie 2026", {
      description: "Alertele sunt active pentru această cultură.",
    });
    expect(
      JSON.parse(window.localStorage.getItem(SOWING_PLAN_IDS_KEY) ?? "[]"),
    ).toEqual(["sp_1"]);
  });

  it("shows the back link straight away when the profile already has a plan", async () => {
    latestByProfile.mockResolvedValue(PLAN);
    renderScreen();
    expect(
      await screen.findByRole("link", { name: "Înapoi la culturile tale" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Marchează semănat" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("22 septembrie 2026")).toBeInTheDocument();
  });

  it("reports a failed save and lets the farmer try again", async () => {
    markSown.mockRejectedValueOnce(new Error("boom"));
    const user = userEvent.setup();
    renderScreen();

    await user.click(await findCta());
    await user.click(screen.getByRole("button", { name: "Confirmă" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Nu am putut salva. Încearcă din nou.",
      ),
    );
    expect(screen.getByRole("button", { name: "Confirmă" })).toBeEnabled();
  });

  it("is read-only without wizard params", () => {
    search = "";
    renderScreen();
    expect(
      screen.getByRole("heading", { name: "Grâu de toamnă · Glosa" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(latestByProfile).not.toHaveBeenCalled();
  });
});
