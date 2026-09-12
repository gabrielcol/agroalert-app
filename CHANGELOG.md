# Changelog

Every task, bugfix or modification gets an entry here (newest first). Each entry names the
**datetime** and the **branch** it was made on.

- **2026-09-13 00:05 (EEST)** — `feat/crop-calendar-timeline` — Crop Calendar timeline and
  Sowing Date
  ([`docs/issues/0008-crop-calendar-timeline-sowing-date.md`](docs/issues/0008-crop-calendar-timeline-sowing-date.md)).
  The summary's static calendar card is now a vertical timeline (shadcn Studio block
  `timeline-component-02` under `src/components/shadcn-studio/blocks/`, adapted to the
  480px phone shell: single column, no marketing heading, dots stuck under the header;
  scroll-driven line fill kept via the new `motion` dependency). Stages carry static
  day offsets (`CALENDAR_STAGE_DAYS`: 0 / +10 / +150 / +60 / +50) and pure date helpers
  in `src/lib/agro/crop-calendar.ts`. Confirming "Ai semănat azi?" in the sticky bar
  creates a **Sowing Plan** (new Prisma model + migration `sowing_plan`, Zod contract in
  `src/lib/agro/sowing-plan.ts`, public tRPC router `sowingPlan` with `markSown`,
  `latestByProfile`, `byIds`); the dates then fill in and the bar becomes the way back.
  The summary reads `?profile&crop&variety` (title from the Crop Dictionary), the
  subscribe card and toast are gone and the alerts card reads "Alertele sunt active".
  The dashboard lists the Sowing Plans this browser created (`localStorage`
  `agro.sowingPlanIds`, `useSyncExternalStore`) with sown date and next Stage; the
  sample plan is gone. Glossary: Stage, Sowing Date, reworked Crop Calendar; the
  Alert Subscription row is dropped. Config: `.claude/**` (agent worktrees) is ignored
  by ESLint, Prettier and Vitest so the gate reads only the repo's own code. Tests:
  Zod contract, router (fake db), calendar helpers (incl. DST), id store, summary
  confirm flow and `CropTimeline` (vendor block mocked), `formatLongDate`; Playwright
  `e2e/agro.spec.ts` rewritten for the new step 4, the dashboard empty/populated states
  and the phone-viewport bar — **written, not run** (AGENTS.md rule 3).
- **2026-09-12 23:34 (EEST)** — `feat/weather-brief-integration` — Weather Brief
  integration: real seam, e2e walk-through, docs
  ([`docs/issues/0007-weather-brief-integration.md`](docs/issues/0007-weather-brief-integration.md)).
  The recommendation now reads real weather: `getRecommendationService()` builds its
  `WeatherBriefSource` with `createOpenMeteoWeatherBriefSource({ db })`, which calls
  issue 0005's `getWeatherBrief(profile.id, { db })`; the fixture source stays as a test
  double only. The service anchors the model call on the brief's own `today` and maps the
  weather module's errors explicitly: its `WeatherUnavailableError` (a different class
  with the same name as the AI module's, imported under an alias) becomes the
  recommendation's `WeatherUnavailableError` with the cause kept, `FieldProfileNotFoundError`
  passes through and the router answers `NOT_FOUND`. Docs: `.env.example` and README say
  `ANTHROPIC_API_KEY` is optional at boot and required at recommendation time, and that
  `AI_MODEL` must be Sonnet- or Opus-class. Bug found by the e2e run and fixed: the global
  `Permissions-Policy` header sent `geolocation=()`, which disabled the teren step's locate
  button in every browser; it is now `geolocation=(self)`. `e2e/agro.spec.ts` walks the
  four steps against tRPC mocked via `page.route` (geocode, Field Profile, both
  recommendations; `mockRecommendation` gained an optional superjson `meta`) and follows
  the real URL contract; the cultura/soi retry specs target the shadcn alert since Next's
  route announcer is also `role=alert`. Tests: seam and service mapping unit tests, a
  router NOT_FOUND case; Vitest 38 files / 233 tests green; the full Playwright suite was
  run (`E2E_PORT=3100`): 24 passed. Live smoke test against Open-Meteo (no mocks, lat
  44.6 / lng 27.1): a valid Weather Brief in 4.3 s, second call 2 ms from the
  `WeatherCell` cache; the Anthropic leg is pending a real key (none set locally).
- **2026-09-12 23:20 (EEST)** — `feat/crop-variety-recommendation` — Crop and Variety
  Recommendation: Claude call, cultura and soi steps
  ([`docs/issues/0006-crop-variety-recommendation-ai-call.md`](docs/issues/0006-crop-variety-recommendation-ai-call.md)).
  `src/lib/ai/`: the Anthropic SDK is called server-side with the compact Crop Dictionary
  in a prompt-cached system block (stable bytes, `cache_control: ephemeral`) and today's
  date, the Field Profile (surface as a hectare range, Soil Class, irrigation) and the
  Weather Brief in the user turn; structured output is a forced tool call whose JSON
  schema derives from the frozen Zod contracts and is re-validated with the same schema
  before storage. The 46-day candidate rule is computed in code (`candidates.ts`, `MM-DD`
  windows with year wrap) and both stated in the prompt and enforced on the answer: a
  non-candidate in the top list is demoted to `excluded`; invented varieties are dropped
  and an omitted one rejects the ranking. `recommendation.crops` / `.varieties` are
  idempotent (stored row returned, no second model call) and map failures to
  `SERVICE_UNAVAILABLE` / `WEATHER_UNAVAILABLE` and `INTERNAL_SERVER_ERROR` /
  `AI_INVALID_OUTPUT` | `AI_UNAVAILABLE`. Weather Brief source is a seam
  (`weather-brief-source.ts`) on the foundation fixture until issue 0005's
  `getWeatherBrief` lands. `ANTHROPIC_API_KEY` is now optional at boot (missing key fails
  only the AI call). `CropId` is a real union pinned to the compact dictionary by test.
  Screens: `/plan/cultura?profile=<id>` renders the top 3 as choice cards with fit, two
  reasons, risks, confidence, the Recommended badge on rank 1 and an "Alte culturi"
  collapsible (shadcn) for the excluded crops; `/plan/soi?profile&rec&crop` renders every
  dictionary variety ranked; both show a retry screen (shadcn Alert) on any failure and
  redirect when URL params are missing. Mock crop / variety ids and their copy are
  removed from `mock-data.ts` and the dictionaries; new copy under
  `agro.cultura.recommendation.*` and `agro.soi.titleFor`. Tests: Vitest 161 green
  (candidate rule incl. the day-50 case, tool schema and parsing, prompts, recommend with
  a fake client and malformed payloads, router with a fake db and fake service, UI
  helpers). Playwright `e2e/cultura.spec.ts` and `e2e/soi.spec.ts` mock tRPC at the network
  edge — written, not run (rule 3: e2e runs pre-deploy). Known: `e2e/agro.spec.ts`'s
  four-step walk-through predates the URL contract and needs issue 0004's teren flow to
  pass again.
- **2026-09-12 23:13 (EEST)** — `feat/weather-brief-client` — Weather Brief: Open-Meteo
  client, aggregation and cache
  ([`docs/issues/0005-weather-brief-open-meteo-client.md`](docs/issues/0005-weather-brief-open-meteo-client.md)).
  `weather.brief` now returns real data. `src/lib/weather/open-meteo.ts` is a keyless client
  with an injectable `fetch` for three endpoints: the archive (daily max/min/mean
  temperature, precipitation, FAO ET0 over the ten full years before this one plus the
  year to date, ending five days back for ERA5 latency), the forecast (`forecast_days=16`,
  `past_days=30`, daily rows plus hourly `soil_temperature_6cm` /
  `soil_moisture_3_to_9cm` averaged per day, carried forward where the model stops
  publishing them) and the seasonal API (`models=ecmwf_ec46`, 46 days, ensemble mean over
  the control run and 50 members). One verified deviation from the issue text: the archive
  is queried with Open-Meteo's default model blend, labelled `ERA5-Land/ERA5`, because
  `models=era5_land` alone returns null precipitation and ET0 for every day. Pure
  aggregation in `climate.ts` (monthly normals, frost/heat per year with day-of-year
  mean + spread, GDD base 5/10, per-year table with the driest 60-day window and a
  drought flag below mean minus one standard deviation; Current Season with the running
  month's precipitation normal scaled to the days observed), `forecast.ts` and
  `outlook.ts` (weeks 3-7 as anomalies against the Climate Profile's own normals, the
  dominant tendency labelled, always `confidence: "low"`). `brief.ts` exports
  `getWeatherBrief(fieldProfileId, { db, client?, now? })` for issue 0006: it reads the
  `WeatherCell` row for the 0.1° cell, refreshes the Climate Profile after 30 days and
  the short-range pieces after 6 hours (or when the cached rows are keyed to another
  day), stores aggregates only — the Current Season rides in the `forecast` column next
  to the Forecast, both keyed to today, since the cell has no dedicated column — and
  throws `WeatherUnavailableError` on any Open-Meteo failure, writing nothing; the router
  maps it to `SERVICE_UNAVAILABLE` and an unknown profile to `NOT_FOUND`. The stub fixture
  now derives its dates from today instead of a hard-coded 2026-09-12. Tests: recorded
  responses under `src/lib/weather/__fixtures__/` (lat 44.6, lng 27.1), a hand-computed
  three-year synthetic series for the aggregation arithmetic, URL/parameter and
  failure-mapping tests for the client, cache hit / short TTL / long TTL / stale-by-date /
  corrupt-row / failure tests for `getWeatherBrief`, router mapping tests; Vitest green
  (176 tests, 27 files). Playwright: none — no route surfaces `weather.brief` yet and a
  spec would hit Open-Meteo; the retry screen's e2e coverage belongs to issue 0006.
- **2026-09-12 23:06 (EEST)** — `feat/field-location-teren` — Field Location, Soil Class
  and Field Profile creation on the teren step
  ([`docs/issues/0004-field-location-teren-step.md`](docs/issues/0004-field-location-teren-step.md)).
  The first wizard step stops being a prototype. `geocode.search` now calls the Open-Meteo
  Geocoding API (`src/lib/geocode/open-meteo.ts`: `countryCode=RO`, `count=5`,
  `language=ro`, fetch injectable, names joined as "Sat, Comuna, Județ", non-RO results
  dropped, upstream failures mapped to `BAD_GATEWAY`); the teren screen takes the first
  match silently. The locate button is live: browser geolocation fills the Field Location
  and labels the village field "Locația curentă" (Open-Meteo has no reverse geocoding), a
  denial shows an inline error. A Soil Class toggle group (cernoziom / lutos / argilos /
  nisipos / nu știu, default `unknown`) joins land size and irrigation; land buckets are
  unchanged. "Continuă" geocodes if needed, creates the Field Profile through
  `fieldProfile.create`, then requests `recommendation.crops` (still the 0003 stub until
  issue 0006) while the loader plays, and lands on `/plan/cultura?profile=<id>`. The loader
  has six real stages: `location` ("Găsim terenul") is prepended to the five from issue
  0001 and completes when the Field Location resolves; the rest tick while the
  recommendation is pending, never past the last, and all complete when it settles
  (`src/lib/agro/loading-stages.ts`). A failed call freezes the stages under "Nu am putut
  pregăti recomandarea." with a retry that reuses the created profile. New i18n keys, RO/EN:
  `agro.teren.village.{located,notFound,denied}`, `agro.loading.{error,retry}`. Tests:
  geocode client (URL params, mapping, empty, non-RO, HTTP error), geocode router with a
  stubbed fetch, loader stage progression, teren screen (Soil Class default, geocode →
  create → crops → navigate, not-found, geolocation, retry without recreating the
  profile); Vitest green (146 tests, 25 files). Playwright `e2e/teren.spec.ts` written
  (tRPC mocked via `page.route`, geolocation via the browser context) but not run — e2e runs
  pre-deploy per rule 3. Known follow-up: the wizard walkthrough in `e2e/agro.spec.ts`
  still expects the teren step to reach `/plan/cultura` without a backend and now needs
  the same mocks; left to the pre-deploy e2e pass since 0006 changes that flow again.
- **2026-09-12 22:50 (EEST)** — `feat/weather-brief-foundation` — Foundation: Weather Brief
  and recommendation data model
  ([`docs/issues/0003-weather-brief-recommendation-data-model.md`](docs/issues/0003-weather-brief-recommendation-data-model.md)).
  The shared substrate issues 0004-0006 build on, nothing touching a screen. Prisma gains
  `FieldProfile` (anonymous, cuid id in the wizard URL), `WeatherCell` (Open-Meteo cache
  keyed by the 0.1° cell, unique on `latCell, lngCell`, aggregated JSON only),
  `CropRecommendation` (result + the Weather Brief snapshot it was given) and
  `VarietyRecommendation`, migration `20260912194116_weather_brief_foundation`. The frozen
  Zod contracts: `src/lib/weather/schema.ts` (`climateProfileSchema`, `currentSeasonSchema`,
  `forecastSchema` — exactly 16 days, 7 trusted — `seasonalOutlookSchema` — weeks 3-7 as
  anomalies, `confidence: "low"` — and `weatherBriefSchema`), `src/lib/agro/field-profile.ts`
  (Soil Class, land buckets with their hectare ranges, `fieldProfileInputSchema`, the
  0.1° `weatherCellFor`) and `src/lib/agro/recommendation-schema.ts` (top-3 Crop
  Recommendation with fit / reasons / risks / window / varieties / confidence plus the
  excluded list; Variety Recommendation ranking; the stored-record shapes). Crop ids are
  validated against the Crop Dictionary: `scripts/build-crop-dictionary.ts`
  (`bun run build:crop-dictionary`) strips every `{value, source, verified}` wrapper and the
  `economics` block from `resources/culturi/crop-dictionary.json` into the committed
  `src/lib/agro/crop-dictionary.compact.json` (428 KB → 113 KB, 22 crops), read through
  `src/lib/agro/crop-dictionary.ts`. tRPC surface with stub bodies returning fixtures:
  `fieldProfile.create` / `fieldProfile.get` (real, Prisma-backed), `geocode.search`,
  `weather.brief`, `recommendation.crops`, `recommendation.varieties`; every procedure
  declares `.output()` against the contracts. Env: `ANTHROPIC_API_KEY` (required) and
  `AI_MODEL` (default `claude-sonnet-5`) in `src/env.ts` / `.env.example` — `.env` now
  needs `ANTHROPIC_API_KEY` for `bun dev` and the e2e web server. i18n reserves
  `agro.teren.soil`, `agro.loading.steps.location`, `agro.cultura.recommendation` and
  `agro.soi.ranking` in RO/EN. Tests: strip script (nested leaf, missing field,
  `varieties[]`), compact dictionary, Field Profile input, Weather Brief and recommendation
  round-trips and rejections, and one router test per procedure with a fake db; Vitest
  green (129 tests, 22 files). Playwright: none — exempt under rule 3, this issue has no
  UI surface. ADR 0003 and the ADR 0001 amendment landed on `main` with the issue.
- **2026-09-12 22:19 (EEST)** — `feat/sticky-header-cta-bar` — Sticky header and sticky
  CTA bar ([`docs/issues/0002-sticky-header-and-cta-bar.md`](docs/issues/0002-sticky-header-and-cta-bar.md)).
  The phone chrome stops scrolling away. `PhoneHeader` becomes `sticky top-0 z-20` on an
  opaque `bg-background` (it already had the bottom hairline), and a new shared
  `StickyBar` (`src/components/agro/sticky-bar.tsx`) closes every screen: solid
  `bg-background`, `border-t` hairline, the same `px-5` gutter as `Screen`, 14px of
  vertical padding and `pb-[calc(14px+env(safe-area-inset-bottom))]` under it. The bar is the
  last flex child of the phone column, so it reserves its own space and the end of the
  content clears it; while the page is taller than the viewport `sticky bottom-0` floats it
  over whatever scrolls past, which is why it is opaque and carries a z-index. Verified at
  a 390×700 viewport: on `/plan/rezumat` (scroll height 1554) the header stays at y=0 and
  the bar at y=611 both unscrolled and at the bottom of the scroll, with 53px between the
  last card and the button once scrolled to the end. All five public screens use it: the dashboard's dashed "Adaugă o cultură
  nouă" button (styling untouched, only its `mt-3.5` dropped), the `PrimaryCta` of teren /
  cultura / soi (replacing the `flex-1` spacer + CTA at the end of `Screen`), and the
  summary's subscribe CTA — which leaves its `PlanCard`, the card keeping its heading and
  body, so the action is reachable without scrolling past four plan cards; after
  subscribing the bar grows to hold the disabled "Abonat" button and, under it, the link
  back to the dashboard. The loading screen has no action and gets no bar. `PrimaryCta`
  drops its `mt-[22px]` (the bar owns the spacing) and `Screen`'s bottom padding goes
  `30px` → `18px` for the same reason. `src/app/(agro)/layout.tsx` gains
  `export const viewport: Viewport = { viewportFit: "cover" }` — without it
  `env(safe-area-inset-bottom)` always reports 0 and the home-indicator padding would be
  dead code. It is scoped to the phone routes rather than the root layout because
  `viewport-fit=cover` also drops the browser's automatic _side_ insets, which the admin
  and auth areas have no reason to take on. The root layout's `<Toaster>` moves to
  `position="top-center"`: sonner is bottom-anchored and full-width under 600px, so the
  subscribe toast would have landed on top of the bar it just confirmed, covering the
  "Abonat" state and the back link for its four seconds. Tests: `src/components/agro/sticky-bar.test.tsx` (children, sticky /
  `bottom-0` / `z-20`, the solid bar + hairline + gutter, the safe-area padding class,
  caller classes) and `src/components/agro/phone-header.test.tsx` (sticky, opaque, keeps
  its hairline, still renders title + dots), written before the implementation; Vitest is
  green (80 tests, 13 files). `e2e/agro.spec.ts` gains a phone-viewport test
  (390×600) asserting via `boundingBox()` that the header and the summary CTA are on
  screen unscrolled **and** at the bottom of the scroll, that the last card clears the bar,
  and that the "Abonat" state plus the back link fit — **written, not run**, per AGENTS.md
  rule 3 (e2e runs pre-deploy).

  Branch note: `feat/sticky-header-cta-bar` is cut from `feat/wizard-content-refinements`,
  **deliberately stacked on that unmerged branch** (user's decision, against rule 10),
  because the sticky bar rearranges exactly the screens issue 0001 just rewrote. Its PR
  targets `feat/wizard-content-refinements`; once 0001 merges, this branch must be rebased
  or retargeted onto `main`.

- **2026-09-12 22:12 (EEST)** — `main` — Issue 0002: sticky header and CTA bar
  ([`docs/issues/0002-sticky-header-and-cta-bar.md`](docs/issues/0002-sticky-header-and-cta-bar.md)).
  Opened the ticket for making `PhoneHeader` sticky at the top and adding a shared
  `StickyBar` at the bottom of the five public AgroAlert screens (dashboard + the four
  wizard steps), with the agreed bar style (solid `bg-background`, top hairline, `px-5`,
  ~14px vertical padding plus `env(safe-area-inset-bottom)`), the summary screen's subscribe
  button moving out of its card into the bar, and no bar on the loading screen. Docs-only,
  so test-exempt under AGENTS.md rule 3. The work branch `feat/sticky-header-cta-bar` is
  cut from `feat/wizard-content-refinements`, **deliberately stacked on that unmerged
  branch** (user's decision, against rule 10) because the sticky bar rearranges the same
  screens that branch just rewrote; it must be rebased or retargeted onto `main` once
  issue 0001 merges.

- **2026-09-12 22:00 (EEST)** — `feat/wizard-content-refinements` — Wizard content
  refinements ([`docs/issues/0001-wizard-content-refinements.md`](docs/issues/0001-wizard-content-refinements.md)).
  Three changes to the wizard prototype. (1) **Alert subscription replaces the alert
  channel:** the summary screen's "Cum vrei să primești alertele?" radio card and the
  full-screen confirmation are gone; in their place a single "Primește alerte pentru acest
  plan" card whose CTA raises a sonner toast, then locks into a disabled "Abonat" state
  with a check icon and a link back to the dashboard. How alerts are delivered is not a
  property of a Sowing Plan, so `CHANNELS` / `ChannelId` / `DEFAULT_CHANNEL`,
  `SAMPLE_PLANS[].channel`, `agro.rezumat.channel`, `agro.rezumat.activate`, `agro.done`
  and `src/components/agro/channel-options.tsx` were all removed (the shadcn
  `ui/radio-group` primitive stays). (2) **Reasons on every choice card:** new
  `ReasonList` component renders three always-visible icon bullets — soil fit, sowing
  window, weather fit — plus a muted caution line on the risky options only (orz, rapiță,
  Pitar, Ursita), on both the crop and variety screens. It emits `span`/`svg` only,
  because it lives inside `ChoiceCard`'s `<button>`. Crop and variety descriptions were
  rewritten so they no longer restate the bullets. (3) **Loading screen:** the four steps
  about a 7-day forecast became five steps naming what the recommendation actually rests
  on (past years' weather, the forecast ahead, crops, sowing windows, the list itself),
  ~4 s total; `STEP_MS` unchanged. `CONTEXT.md` swaps the Alert Channel row for an Alert
  Subscription row. Tests: new `src/lib/agro/mock-data.test.ts` (step ids and order,
  RO/EN copy parity including which ids carry a caution, channel-free `SAMPLE_PLANS`) and
  `src/components/agro/reason-list.test.tsx` (order, optional caution, `aria-hidden`
  icons, phrasing-content-only markup); Vitest is green (72 tests). The Playwright spec
  `e2e/agro.spec.ts` was updated for all three changes but **not run** — per the amended
  AGENTS.md rule 3 the e2e suite runs before each deploy, not per PR.

- **2026-09-12 21:56 (EEST)** — `main` — Markdown issue tracker + e2e gate moved to
  pre-deploy. Added `docs/issues/` as the project's issue tracker (one markdown file per
  issue, `NNNN-kebab-slug.md`, frontmatter `status` / `branch` / `created`) with
  `docs/issues/README.md` describing the format, and the first issue,
  `docs/issues/0001-wizard-content-refinements.md`. `AGENTS.md` rule 1 now points at that
  folder instead of the `<TRACKER_URL>` placeholder; rule 3 keeps "every task ships unit
  **and** e2e tests" but makes the per-task gate `typecheck` + `lint` +
  `prettier --check` + Vitest, with the Playwright suite running **before each deploy**
  rather than per PR (prototype/hackathon pace). The no-runtime-surface exemption is
  unchanged. Docs-only, so test-exempt under that rule. Committing the issue file to
  `main` is the analogue of opening a ticket, not task work.

- **2026-09-12 13:45 (EEST)** — `feat/agroalert-design-shell` — AgroAlert design shell.
  Implemented the Claude Design prototype (`app/index.html`) as public Next.js routes: `/`
  (sowing-plan dashboard), `/plan/teren`, `/plan/cultura`, `/plan/soi`, `/plan/rezumat`,
  with the staged loading screen and the "alerts active" confirmation. Prototype-level
  interactivity only (selection states, step navigation, timed loading); no persistence or
  API. Authentication is hidden, not removed: the old landing page and its sign-in link are
  gone, the `(admin)` area keeps its session guard and `/sign-in` still resolves. Theme
  re-tokenised to the design (Geist / Geist Mono, warm-neutral ink primary, green signal
  accent, `brand` / `success` / `warning` / `subtle` / `faint` colours). App renamed
  "AgroAlert"; default locale switched to Romanian (EN stays selectable via the admin-area toggle; the public screens follow the design and have none); new `agro`
  i18n namespace in both dictionaries. Added shadcn `toggle` / `toggle-group`. Fixed the
  prototype's duplicated "Alerte pentru zona ta" card (one card, three rows). Tests: unit
  (`plan-steps`), e2e (`e2e/agro.spec.ts`), and the language-toggle / config-default specs
  updated for the RO default. Started `CONTEXT.md` (domain glossary). Review follow-ups: dropped the `cn` package the
  shadcn CLI added by mistake, moved `SystemConfig.defaultLocale`'s schema default to `ro`
  (migration `default_locale_ro`), pointed the admin sidebar wordmark at `/dashboard`
  (the public shell has no route back into the signed-in area), swapped the sign-in
  panel glyph to the sprout, and refreshed the README i18n/structure notes.

- **2026-09-12 (EEST)** — `main` — Whitelabel reset. Removed the previous product's domain
  features, screens (including the tablet/kiosk flow), naming, ticket references, client
  brief and history. What remains is the reusable foundation: better-auth (sign-in,
  admin-provisioned accounts) + RBAC (`admin` / `member` / `auditor`), an append-only audit
  log, user management, a system-settings singleton (default locale, site name), EN/RO
  i18n (English default), the demo `Post` slice, security headers, Docker packaging, and
  the Vitest + Playwright setup. Migrations squashed into a single `init`. Package renamed
  to `app-base`. Dev/test sign-in rate limit relaxed so parallel e2e workers pass.
