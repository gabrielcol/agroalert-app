import { expect, test, type Page, type Route } from "@playwright/test";

// The teren step against mocked tRPC: geocoding, Field Profile creation, the
// two Weather Brief cache-warming calls and the Crop Recommendation call are
// answered by page.route so the spec needs neither Open-Meteo nor the AI.
// Written per issue 0004, extended per issue 0011; run pre-deploy.

const PROFILE_ID = "e2e_profile_1";
const MATCH = {
  name: "Reviga, Comuna Reviga, Ialomița",
  lat: 44.68,
  lng: 27.1,
};

type Call = { path: string; input: unknown };

/** Answers every batched tRPC call the teren step makes and records inputs. */
async function mockTrpc(page: Page, calls: Call[], failCropsTimes = 0) {
  let cropsFailures = 0;
  await page.route("**/api/trpc/**", async (route: Route) => {
    const url = new URL(route.request().url());
    const paths = url.pathname.replace(/^.*\/api\/trpc\//, "").split(",");
    const rawInput =
      route.request().postData() ?? url.searchParams.get("input");
    const inputs = rawInput
      ? (JSON.parse(rawInput) as Record<string, { json: unknown }>)
      : {};

    const results = paths.map((path, i) => {
      const input = inputs[String(i)]?.json;
      calls.push({ path, input });
      if (path === "geocode.search") {
        return { result: { data: { json: [MATCH] } } };
      }
      if (path === "fieldProfile.create") {
        const data = {
          ...(input as object),
          id: PROFILE_ID,
          createdAt: new Date().toISOString(),
        };
        return { result: { data: { json: data } } };
      }
      if (path === "weather.climate" || path === "weather.forecast") {
        return {
          result: { data: { json: { cellId: "44.6,27.1", refreshed: true } } },
        };
      }
      if (path === "recommendation.crops") {
        if (cropsFailures < failCropsTimes) {
          cropsFailures += 1;
          return {
            error: {
              json: {
                message: "boom",
                code: -32603,
                data: { code: "INTERNAL_SERVER_ERROR" },
              },
            },
          };
        }
        return {
          result: {
            data: { json: { id: "stub", fieldProfileId: PROFILE_ID } },
          },
        };
      }
      return { error: { json: { message: `unmocked ${path}`, code: -32004 } } };
    });
    await route.fulfill({ json: results });
  });
}

test.describe("teren step", () => {
  test("typed village → first geocode match → profile → cultura with the id", async ({
    page,
  }) => {
    const calls: Call[] = [];
    await mockTrpc(page, calls);
    await page.goto("/plan/teren");

    await expect(page.getByRole("button", { name: "Continuă" })).toBeDisabled();
    await page.getByLabel("Sat / comună").fill("Reviga");
    await page.getByRole("radio", { name: "10+ ha" }).click();
    await page.getByRole("radio", { name: "Da, am" }).click();
    await expect(page.getByRole("radio", { name: "Nu știu" })).toHaveAttribute(
      "data-state",
      "on",
    );
    await page.getByRole("radio", { name: "Cernoziom" }).click();
    await page.getByRole("button", { name: "Continuă" }).click();

    // One step on screen at a time, each waiting on its own call; it starts
    // on "Găsim terenul" and ends on the recommendation step (issue 0011).
    await expect(page.getByText("Pregătim recomandarea")).toBeVisible();
    const stage = page.locator("[data-stage]");
    await expect(stage).toHaveCount(1);
    await expect(stage).toHaveAttribute("data-stage", "location");
    await expect(stage).toHaveText("Găsim terenul");
    await expect(page.locator("[data-stage='recommendation']")).toHaveText(
      "Alegem culturile potrivite pentru tine",
      { timeout: 10_000 },
    );

    await expect(page).toHaveURL(`/plan/cultura?profile=${PROFILE_ID}`, {
      timeout: 20_000,
    });

    const create = calls.find((c) => c.path === "fieldProfile.create");
    expect(create?.input).toMatchObject({
      lat: MATCH.lat,
      lng: MATCH.lng,
      villageName: "Reviga",
      landBucket: "large",
      irrigation: true,
      soilClass: "cernoziom",
    });
    expect(calls.find((c) => c.path === "geocode.search")?.input).toEqual({
      query: "Reviga",
    });
    expect(calls.find((c) => c.path === "recommendation.crops")?.input).toEqual(
      {
        fieldProfileId: PROFILE_ID,
      },
    );
    // Every displayed step is backed by a real call, in order.
    expect(
      calls
        .map((c) => c.path)
        .filter((path) =>
          [
            "geocode.search",
            "weather.climate",
            "weather.forecast",
            "recommendation.crops",
          ].includes(path),
        ),
    ).toEqual([
      "geocode.search",
      "weather.climate",
      "weather.forecast",
      "recommendation.crops",
    ]);
  });

  test("the locate button uses the phone's position and skips geocoding", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 45.1, longitude: 26.2 });
    const calls: Call[] = [];
    await mockTrpc(page, calls);
    await page.goto("/plan/teren");

    await page
      .getByRole("button", { name: "Detectează automat locația" })
      .click();
    await expect(page.getByLabel("Sat / comună")).toHaveValue(
      "Locația curentă",
    );
    await page.getByRole("button", { name: "Continuă" }).click();

    await expect(page).toHaveURL(`/plan/cultura?profile=${PROFILE_ID}`, {
      timeout: 20_000,
    });
    expect(calls.some((c) => c.path === "geocode.search")).toBe(false);
    expect(
      calls.find((c) => c.path === "fieldProfile.create")?.input,
    ).toMatchObject({
      lat: 45.1,
      lng: 26.2,
      villageName: "Locația curentă",
    });
  });

  test("a failed recommendation shows a retry that reuses the profile", async ({
    page,
  }) => {
    const calls: Call[] = [];
    await mockTrpc(page, calls, 1);
    await page.goto("/plan/teren");

    await page.getByLabel("Sat / comună").fill("Reviga");
    await page.getByRole("button", { name: "Continuă" }).click();

    await expect(
      page.getByText("Nu am putut pregăti recomandarea."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Încearcă din nou" }).click();

    await expect(page).toHaveURL(`/plan/cultura?profile=${PROFILE_ID}`, {
      timeout: 20_000,
    });
    expect(calls.filter((c) => c.path === "fieldProfile.create")).toHaveLength(
      1,
    );
    expect(calls.filter((c) => c.path === "recommendation.crops")).toHaveLength(
      2,
    );
  });
});
