# AI eval dataset

Fixed inputs for the two Claude calls in `src/lib/ai` — Crop Recommendation
(`recommendCrops`) and Variety Recommendation (`rankVarieties`) — with the
constraints a correct answer has to satisfy, written down before the answer
exists.

## Purpose

Demo confidence, nothing more. Before the hackathon demo we want to be able to
change a prompt or a model and check the result against something other than a
vibe. The dataset is the frozen half: expectations written down before the
answer existed, alongside inputs that cannot drift. Since issue 0022 there are
two ways to use it — a **static suite** that keeps the dataset honest on every
`bun run test`, and an **opt-in live runner** that spends tokens and measures a
model against it. No model output is recorded in this folder: a run writes its
report to `evals/results/`, which is gitignored.

## Layout

```
evals/
  README.md            this file
  briefs/              frozen Weather Briefs, one JSON file per brief
    SUMMARY.md         generated table of every brief's headline numbers
  cases/               the cases, one JSON file per case
  dataset.test.ts      the static suite: every brief and every case
  run.ts               the live runner (`bun run eval`)
  lib/                 case schema, loader, static checks, assertions
  results/             JSON reports written by a run (gitignored)
```

- `evals/briefs/*.json` are written by `bun run capture:eval-briefs`
  (`scripts/capture-eval-briefs.ts`). Six are **captured** — real Open-Meteo
  data frozen on 2026-09-13 for Reviga, Cobadin, Dăbuleni, Lovrin, Turda and
  Podu Iloaiei. Three are **synthetic** — generated from `weatherBriefFixture`
  for 2026-03-05, 2026-10-05 and 2026-08-20, dates no capture can cover, each
  with a `notes` field saying exactly what was derived.
- `evals/cases/*.json` are hand-authored. 26 of them: 20 Crop Recommendation
  cases and 6 Variety Recommendation cases.

## Running

Two entry points, and only the second one costs anything:

```bash
bun run test                      # the static suite, zero model tokens
bun run eval                      # the live runner: calls Claude on all 26 cases
bun run eval --filter reviga --kind crops --model claude-haiku-4-5 --concurrency 2
```

`bun run test` includes `evals/dataset.test.ts`, which parses every brief and
runs every check under "Validating the dataset" over every case. It is the
guard against dataset rot: a recapture, a dictionary rebuild or a hand edit that
invalidates a case fails the suite instead of producing a meaningless
measurement later.

`bun run eval` (`evals/run.ts`) is opt-in. Flags:

| flag                | default                              | effect                              |
| ------------------- | ------------------------------------ | ----------------------------------- |
| `--filter <substr>` | none                                 | only cases whose `id` contains it   |
| `--kind crops`      | both                                 | `crops` or `varieties` cases only   |
| `--model <id>`      | `$AI_MODEL`, else `claude-haiku-4-5` | the model asked                     |
| `--concurrency <n>` | `2`                                  | how many cases run at the same time |

It reads `ANTHROPIC_API_KEY` from the environment (bun loads `.env` itself).
Output is one line per case as it finishes — `PASS <id> (12.3s, 1 attempt)`, or
`FAIL` followed by the indented issues and the case's `rationale` — then a
`passed/total` tally, then the path of a JSON report written to
`evals/results/<timestamp>-<model>.json` (gitignored) holding every result, its
attempts and the parsed output, so a failure can be re-read without re-running.

Exit codes: `0` every selected case passed, `1` at least one failed (or no case
matched the flags), `2` no `ANTHROPIC_API_KEY` — in which case nothing is called.

## Case schema

```jsonc
{
  "id": "crops-reviga-cernoziom-irrigated", // == file name without .json
  "kind": "crops", // "crops" | "varieties"
  "category": "grid", // "grid" | "date" | "stress"
  "title": "Cernoziom, irrigated, Bărăgan plain, mid-September",
  "brief": "reviga", // slug of evals/briefs/<slug>.json
  "today": "2026-09-13", // must equal brief.today
  "lowData": false, // true when soilClass is "unknown"
  "profile": {
    // FieldProfile minus id/createdAt (src/lib/agro/field-profile.ts)
    "villageName": "Reviga",
    "lat": 44.7,
    "lng": 27.1,
    "landBucket": "medium",
    "irrigation": true,
    "soilClass": "cernoziom",
  },
  "cropId": "grau_toamna", // varieties cases only; must be a candidate on `today`
  "expect": {
    "mustInclude": ["grau_toamna"], // crops that must be in top (crops cases)
    "mustExclude": ["porumb"], // crops that must NOT be in top; "*" is not allowed, list ids; non-candidates are already covered by invariant 2 so list only candidates you are asserting against
    "fitOrder": [["grau_toamna", "secara"]], // pairs [a, b]: if both are in top, fit(a) > fit(b)
    "maxConfidence": "medium", // optional
    "topAny": ["Glosa", "Izvor"], // varieties cases: at least one of these ranked first
    "varietyOrder": [["Glosa", "Otilia"]], // varieties cases: pairs, fit(a) > fit(b)
  },
  "rationale": "Why each constraint holds, quoting the brief numbers and dictionary fields it rests on.",
}
```

Keys that do not apply are omitted. `profile.lat`/`profile.lng` always equal the
brief's `location` (for the synthetic briefs, Reviga's), and `villageName` is
the brief's place name. A case may carry no `expect` at all: the invariants
below still apply, and `varieties-reviga-grau-toamna-irrigated` is exactly that
— a control case where the dictionary genuinely separates nothing.

Note what a constraint is **not**. There are no golden answers and no rubrics:
the model may phrase, order and score things its own way and still be right.
Every constraint is a boolean assertion over the parsed tool call, and
`fitOrder` / `varietyOrder` pairs are conditional — they bite only when both
members are present.

## Invariants

Four global invariants apply to every crop case:

1. Schema-valid tool call: the output parses with `cropRecommendationSchema`
   (src/lib/agro/recommendation-schema.ts); only dictionary crop ids; 1-3 top
   crops; every non-top dictionary crop appears under `excluded` exactly once.
2. Candidate rule respected: every top crop is in `candidateCropIds(today)`
   (src/lib/ai/candidates.ts, 46-day horizon); each `sowingWindow` lies inside
   one of that crop's dictionary `sowing_windows`.
3. Romanian plain text: every reason and risk is Romanian (heuristic: diacritics
   or Romanian stopwords, no English), one sentence, non-empty; every name in
   `recommendedVarietyIds` exists in that crop's dictionary varieties.
4. Fit and confidence sanity: `fit` strictly descending in `top`; `confidence`
   is not `high` on a case flagged `lowData: true`.

Since issue 0020 the model is only asked for the candidates it leaves out and
`completeExcluded` (src/lib/ai/recommend.ts) fills the rest of the dictionary in
server-side, so invariant 1's "exactly once" clause is asserted on the result
`recommendCrops` returns — which still satisfies it — rather than on the raw tool
call.

Variety invariants: output parses with `varietyRecommendationSchema`; `ranked`
contains exactly the crop's dictionary varieties, none omitted, none added; fit
strictly descending; Romanian reasons.

Because the invariants hold everywhere, a case only spells out what is specific
to it. In particular a crop that is not a candidate on the case date is already
handled by invariant 2 and is never listed in `mustExclude`.

## How constraints were written

Every constraint comes from two places and nowhere else:

- **`evals/briefs/SUMMARY.md` and the brief files** — day-0 tMax/tMin and soil
  temperature, total forecast rain, the last month's temperature and
  precipitation anomaly, the count of drought-flagged years in ten, the
  monthly normals and the frost statistics.
- **`src/lib/agro/crop-dictionary.compact.json`**, the same compact dictionary
  the model is shown — `requirements.soil.suitable_classes` /
  `unsuitable_classes`, `requirements.precipitation.drought_tolerance` and
  `season_need_mm`, `requirements.temperature.germination_soil_c_min` and
  `frost_tolerance_c_min`, `calendar.sowing_windows` (including each window's
  **zone** label), and per-variety `drought_tolerance`, `recommended_zones` and
  `maturity_class`.

Each case's `rationale` quotes the numbers and fields it rests on. If a lever
was not in one of those two places, the case does not assert it — several cases
are deliberately thin for that reason, and say so.

The three recurring levers are:

- **Soil.** A crop whose `unsuitable_classes` contains the case's soil class
  goes in `mustExclude` (wheat, barley and rapeseed on `nisipos` and `argilos`).
- **Calendar zone.** A crop is excluded when every one of its `sowing_windows`
  that is still open on the case date carries a zone label that does not match
  the parcel. This is what removes `rapita_toamna` from the Banat, Transylvania
  and Moldova cases on 2026-09-13 (their zone windows end 09-05 / 09-10, and the
  only window still open is `sudul țării`), and both forages from the
  2026-08-20 case (`sud, irigat` and `zone colinare umede sau irigat`).
- **Water.** On an unirrigated parcel with a dry brief, a crop or variety with
  `drought_tolerance: ridicata` is ordered above one with `medie`, and both
  above `scazuta`. Only the sites the briefs show as dry carry this lever —
  Dăbuleni (10.8 mm forecast, +3.8 °C, 2/10 drought years), Podu Iloaiei
  (9.4 mm), Lovrin (3/10 drought years), Cobadin (-8.4 mm anomaly, 2/10).
  Reviga, with 48.3 mm of forecast rain and 1 drought year in 10, deliberately
  does not.

### Captured vs synthetic

Captured briefs may be used whole: their forecast, current season and climate
profile are all real numbers for the day they were pulled.

Synthetic briefs may **not** be read for a trend. Copied from the briefs'
`notes`:

> Derived from `weatherBriefFixture(today)`, which is not real weather. Re-based
> on the Climate Profile monthly normals for each day's own month […] Known
> incoherence: the fixture's drift is a monotone cooling ramp, so the 16-day
> forecast always trends colder — wrong-signed for a spring date. Day 0 is on
> the month normal; treat the tail as illustrative, not as a trend.

and:

> Left as the fixture generates them: the rain pattern (`precipSum`,
> `precipProbability`, `weatherCode`), `soilMoisture0_9cm`, `windGustsMax`,
> `snowfallSum` (always 0, so a cold date shows no snow) […]

So the three `date` cases only ever lean on day-0 numbers (for example the
6.0 °C soil temperature on 2026-03-05, used against
`germination_soil_c_min`), on the candidate list for the date, and on the
dictionary. None of them asserts anything about warming, cooling, rain totals or
snow.

## Coverage

| id                                              | kind      | category | brief                  | soil      | irrigation | intent                                                                               |
| ----------------------------------------------- | --------- | -------- | ---------------------- | --------- | ---------- | ------------------------------------------------------------------------------------ |
| `crops-cobadin-cernoziom-dryland`               | crops     | grid     | `cobadin`              | cernoziom | no         | Dryland Dobrogea: wheat outranks rapeseed on drought tolerance.                      |
| `crops-cobadin-unknown-dryland`                 | crops     | grid     | `cobadin`              | unknown   | no         | Unknown soil, dryland: rye above rapeseed, confidence capped.                        |
| `crops-dabuleni-nisipos-dryland`                | crops     | grid     | `dabuleni`             | nisipos   | no         | Sand plus the driest forecast: rye above triticale.                                  |
| `crops-dabuleni-nisipos-irrigated`              | crops     | grid     | `dabuleni`             | nisipos   | yes        | Sand knocks out wheat, barley and rapeseed; rye must be in the top.                  |
| `crops-lovrin-lutos-irrigated`                  | crops     | grid     | `lovrin`               | lutos     | yes        | Banat: every rapeseed window for the zone has closed.                                |
| `crops-lovrin-unknown-irrigated`                | crops     | grid     | `lovrin`               | unknown   | yes        | Unknown soil caps confidence; only the calendar exclusion survives.                  |
| `crops-podu-iloaiei-argilos-irrigated`          | crops     | grid     | `podu-iloaiei`         | argilos   | yes        | Clay knocks out wheat, barley and rapeseed; irrigation removes the rest.             |
| `crops-reviga-argilos-dryland`                  | crops     | grid     | `reviga`               | argilos   | no         | Clay exclusion on the wettest brief, so no drought ordering is claimed.              |
| `crops-reviga-cernoziom-irrigated`              | crops     | grid     | `reviga`               | cernoziom | yes        | Loosest grid case: nothing is excluded on cernoziom, wheat must still be in the top. |
| `crops-turda-lutos-dryland`                     | crops     | grid     | `turda`                | lutos     | no         | Transylvania: the rapeseed window closed on 09-05.                                   |
| `crops-synthetic-2026-03-05-reviga-spring`      | crops     | date     | `synthetic-2026-03-05` | cernoziom | no         | Spring: soil at 6 °C rules out maize, soy and beans.                                 |
| `crops-synthetic-2026-08-20-reviga-late-summer` | crops     | date     | `synthetic-2026-08-20` | cernoziom | no         | Late summer: both forages fail their window zone labels.                             |
| `crops-synthetic-2026-10-05-reviga-autumn`      | crops     | date     | `synthetic-2026-10-05` | cernoziom | no         | Only four candidates remain; wheat must be in the top.                               |
| `crops-cobadin-lutos-dryland-small`             | crops     | stress   | `cobadin`              | lutos     | no         | Small dryland holding: rapeseed ordered last but not excluded.                       |
| `crops-dabuleni-argilos-dryland-drought`        | crops     | stress   | `dabuleni`             | argilos   | no         | Clay plus drought: exclusions and the rye/triticale order stack.                     |
| `crops-dabuleni-lutos-dryland-heat`             | crops     | stress   | `dabuleni`             | lutos     | no         | Hottest, driest brief on good loam: rapeseed must not lead.                          |
| `crops-lovrin-lutos-dryland-drought`            | crops     | stress   | `lovrin`               | lutos     | no         | Worst drought record (3/10): rye leads the two medie cereals.                        |
| `crops-podu-iloaiei-lutos-dryland-dry`          | crops     | stress   | `podu-iloaiei`         | lutos     | no         | 9.4 mm of forecast rain: rapeseed out, rye above barley.                             |
| `crops-turda-argilos-dryland-cool`              | crops     | stress   | `turda`                | argilos   | no         | Clay on a cold site; the pair left over cannot be ordered.                           |
| `crops-turda-cernoziom-dryland-cool`            | crops     | stress   | `turda`                | cernoziom | no         | Coldest site: frost tolerance ranks barley last.                                     |
| `varieties-lovrin-rapita-toamna-irrigated`      | varieties | grid     | `lovrin`               | lutos     | yes        | Late sowing: the semitardiv hybrid ranks below the semitimpuriu one.                 |
| `varieties-reviga-grau-toamna-irrigated`        | varieties | grid     | `reviga`               | cernoziom | yes        | Control case: the dictionary separates nothing, invariants only.                     |
| `varieties-turda-grau-toamna-dryland`           | varieties | grid     | `turda`                | lutos     | no         | Only the all-zone wheat varieties fit Transylvania.                                  |
| `varieties-cobadin-triticale-dryland`           | varieties | stress   | `cobadin`              | cernoziom | no         | Dryland Dobrogea: the two ridicata triticales lead.                                  |
| `varieties-dabuleni-rapita-toamna-dryland`      | varieties | stress   | `dabuleni`             | nisipos   | no         | Sand and drought: the ridicata hybrids lead, LG Ambassador unconstrained.            |
| `varieties-podu-iloaiei-orz-toamna-dryland`     | varieties | stress   | `podu-iloaiei`         | argilos   | no         | Dry Moldova: the three ridicata barleys lead.                                        |

The three categories are: **grid**, the systematic sweep — each Soil Class once
irrigated and once not, spread over the six captured locations and the three
land buckets on 2026-09-13; **date**, the three synthetic briefs, which move the
candidate list from 5 crops (September) to 15 (March), 4 (October) and 7
(August); **stress**, parcels where a brief's dry, hot or cold numbers should
change the answer.

## Validating the dataset

These checks live in `evals/lib/static-checks.ts` (`staticIssues`) and run in two
places: `evals/dataset.test.ts` applies them to every case on every `bun run
test`, and the live runner applies them to a case before it spends a call on it.
They are all static, and they catch the mistakes that make a case meaningless:

- file name equals `id`;
- the referenced brief file exists and `brief.today` equals the case's `today`;
- `profile.lat` / `profile.lng` equal the brief's `location`;
- the profile parses with `fieldProfileSchema` (compose dummy `id` and
  `createdAt`, which the stored-record schema requires but a case does not
  carry);
- `lowData` is true exactly when `soilClass` is `unknown`, and a `lowData` case
  carries a `maxConfidence`;
- every crop id used anywhere in the case exists in the Crop Dictionary;
- `mustInclude`, `mustExclude` and every `fitOrder` id is a candidate on
  `today` (`candidateCropIds`), so no constraint duplicates invariant 2;
- `mustInclude` and `mustExclude` are disjoint, `mustExclude` never contains
  `"*"`, and `mustInclude` holds at most 3 ids;
- the case is satisfiable: at least one candidate survives `mustExclude`, and
  `mustInclude` is a subset of the survivors;
- for `varieties` cases, `cropId` is a candidate on `today` and every name in
  `topAny` / `varietyOrder` is a real variety of that crop;
- crops cases carry no `cropId`, `topAny` or `varietyOrder`; varieties cases
  carry no `mustInclude`, `mustExclude` or `fitOrder`;
- `kind`, `category`, `title` and `rationale` are present and well-formed.

Each failure is reported as a sentence naming the offending value, so the suite
says which case broke and why. All 26 cases pass all of the above.

## The runner

`evals/run.ts`, five steps per case:

1. `staticIssues` first. A case that fails it is reported failed and never
   reaches the model: a broken case buys a meaningless measurement.
2. Read the case's brief and build a `FieldProfile` from `case.profile` plus a
   dummy `id` (`eval-<case.id>`) and `createdAt`.
3. Call `recommendCrops` from `src/lib/ai/recommend.ts` directly, with the
   frozen brief, `case.today` and an `Anthropic` client built here (60 s
   timeout, one retry — the same values as `src/lib/ai/client.ts`). A varieties
   case makes the crops call first, so the run mirrors what the product does,
   then calls `rankVarieties` with `case.cropId`. The service in
   `src/lib/ai/service.ts` is deliberately bypassed: it pulls in `@/env`, the
   database and a `server-only` guard, none of which belong in a CLI.
4. Apply the invariants above to the parsed result
   (`evals/lib/assertions.ts`).
5. Apply the case's `expect` constraints and report, per case, which constraint
   failed — with the `rationale` as the explanation of why it should have held.

An error from a call (`AiOutputError`, a timeout) is that case's failure, named
and reported, not the end of the run.

## Known gaps

- **No real model output is recorded here.** The cases were written from the
  briefs and the dictionary before any answer existed, on purpose, and a run's
  report goes to the gitignored `evals/results/`. There is no committed
  measurement to compare a new model against — only the constraints.
- **ADR 0002's source-quoting rule is not evaluated.** The compact dictionary
  the model is shown has the `source` field stripped, so a recommendation
  cannot quote one and the dataset cannot assert that it did. Encoding the rule
  would need a per-field provenance map the cases do not have.
- **The synthetic forecast trend is unreliable** — a monotone cooling ramp and
  never any snow — so the three `date` cases assert nothing that depends on how
  the forecast evolves after day 0.
- **Some pairs cannot be ordered at all.** The compact dictionary gives
  `triticale` no `requirements.temperature` block and gives the rapeseed hybrid
  `LG Ambassador` no `drought_tolerance`, so cases touching them leave those
  comparisons free rather than invent a lever.
- **Land bucket is covered but never asserted on.** All three buckets appear
  across the cases, but nothing in the Crop Dictionary depends on parcel size,
  so no constraint rests on it.

## Recapturing

```bash
bun run capture:eval-briefs
```

rewrites every file in `evals/briefs/` in place, for the day it is run. The
briefs go stale by design — a captured brief is only true for its capture date —
so after a recapture:

- every case's `today` moves with its brief, and the cases must be re-dated to
  match (`today` must equal `brief.today`);
- `candidateCropIds(today)` changes with the date, sometimes drastically (5
  crops on 13 September, 15 on 5 March), so every `mustInclude`, `mustExclude`
  and `fitOrder` id has to be re-checked against the new candidate list;
- the weather numbers quoted in each `rationale` no longer match the files, so
  the water and temperature levers have to be re-derived from the new
  `SUMMARY.md`;
- the soil and calendar-zone levers survive a recapture, because they come from
  the Crop Dictionary rather than the weather — but a date move can still open
  or close a sowing window.

Run the checks under "Validating the dataset" after any recapture.

## Tests

The dataset has a static suite (`evals/dataset.test.ts`: every brief, every case,
every check above) and the runner's pure seams have unit tests of their own —
`evals/lib/romanian.test.ts`, `static-checks.test.ts`, `assertions.test.ts` and
`run.test.ts`, the last driving `runCase` with a fake `MessagesClient` so no test
touches the network. All of it runs in `bun run test`.

**e2e exemption** (AGENTS.md rule 3): `evals/` is developer tooling with no
runtime surface — no route, procedure or component changes, and nothing in
`src/` imports it — so there is no Playwright spec to write.
