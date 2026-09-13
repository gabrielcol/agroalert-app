import { expect, test } from "@playwright/test";

import {
  CROP_RECOMMENDATION,
  mockRecommendation,
} from "./recommendation-mocks";

// Issue 0020 — the model now writes `excluded` reasons only for the candidate
// crops it leaves out; the server fills in every other dictionary crop with a
// templated Romanian reason before the result is stored. That fill runs in
// the tRPC procedure, which this suite mocks at the network edge, so the
// server-side behaviour is covered by `src/lib/ai/recommend.test.ts`. What
// this spec guards is the screen contract the fill exists for: the cultura
// screen still renders the complete `excluded` list, one entry per crop, with
// its reason, under the "Alte culturi" disclosure.
//
// Written per AGENTS.md rule 3; the suite runs before a deploy, not per PR.

const CULTURA_URL = `/plan/cultura?profile=${CROP_RECOMMENDATION.fieldProfileId}`;

test("cultura lists every excluded crop with its reason under Alte culturi", async ({
  page,
}) => {
  const withServerFill = {
    ...CROP_RECOMMENDATION,
    result: {
      ...CROP_RECOMMENDATION.result,
      excluded: [
        ...CROP_RECOMMENDATION.result.excluded,
        {
          cropId: "grau_primavara",
          reason:
            "Fereastra de semănat nu este deschisă acum și nu se deschide în următoarele 46 de zile; următoarea începe pe 20 februarie.",
        },
      ],
    },
  };
  await mockRecommendation(page, {
    "recommendation.crops": { ok: true, data: withServerFill },
  });
  await page.goto(CULTURA_URL);

  await expect(
    page.getByRole("button", { name: /Grâu de toamnă/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Alte culturi" }).click();
  const items = page.locator("li", { hasText: "următoarea începe pe" });
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("20 februarie");
  await expect(page.locator("li", { hasText: "Porumb" })).toContainText(
    "următoarea fereastră este în aprilie",
  );
  await expect(page.locator("li", { hasText: "Orez" })).toContainText(
    "irigare permanentă",
  );
});
