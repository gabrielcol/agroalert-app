# ANM agrometeorological reports: what they are and how AgroPlan can use them

Assessed 2026-09-12 against the `feat/agroalert-design-shell` branch (public wizard,
mock data, no persistence). Source files: `sandbox/anm-info/md/*.md`, converted from
`sandbox/anm-info/pdfs/*.pdf`.

## 1. What the data is

Five annual **"Caracterizare agrometeorologică"** reports from ANM's Serviciul de
Agrometeorologie, one per agricultural year (1 September to 31 August):

| Agricultural year | Text size | Figures referenced | Notes                                            |
| ----------------- | --------- | ------------------ | ------------------------------------------------ |
| 2021–2022         | 59 KB     | 58                 |                                                  |
| 2022–2023         | 60 KB     | 68                 | conclusions section has interleaved columns      |
| 2023–2024         | 68 KB     | 81                 | severe drought year, most detailed conclusions   |
| 2024–2025         | 61 KB     | 78                 | different section naming ("Parametri termici")   |
| 2025–2026         | 76 KB     | 105                | the year that just ended; freshest starting data |

Each report has the same skeleton: Introducere (indicator definitions), Toamna, Iarna,
Primăvara, Vara, Concluzii. The prose describes, per season and per month:

- air temperature ranges and deviations from the 1991–2020 normals;
- soil temperature at 5 and 10 cm in 10-day windows around sowing;
- precipitation, classified into ANM's named classes with l/mp ranges;
- soil moisture reserve (mc/ha) in the 0–20 cm "ogor" layer and the 0–100 cm layer
  under winter wheat and non-irrigated maize, classified into drought classes;
- thermal indices: "indice de împrimăvărare", "unități de arșiță", "unități de frig",
  "unități de ger", real evapotranspiration;
- phenological phase per crop per month (percentage of plants in each phase), with the
  sowing date as the main driver;
- observed damage: crusting/ponding, late-sowing risk, frost without snow cover, heat
  forcing, hail and squalls.

Crops covered: winter wheat and maize as the main subjects, plus barley, rapeseed,
sunflower, sugar beet, potato, orchards (apple, plum, pear, nectarine) and vines.

Spatial resolution is **regional**, not local. The text uses the eight historical
regions (Muntenia, Oltenia, Dobrogea, Moldova, Transilvania, Banat, Crișana, Maramureș)
with compass qualifiers ("sudul Olteniei", "nord-vestul Banatului"). Station names appear
only in the captions of phenology charts (Craiova, Bacău, Zalău, Târgu Mureș, Slatina,
Satu Mare, Negrești, Banloc, Sebeș, Oradea, Bârlad, Caracal, Tecuci, Turda, Dărăbani,
Târgu Ocna, Brașov, Cluj-Napoca, Suceava, Miercurea Ciuc, Iași, Piatra Neamț, Galați),
grouped by DMR (regional meteorological directorate).

## 2. Quality of the markdown conversion

Good enough to read and hand-extract facts. Not good enough to parse automatically.

- **All figures are missing.** The maps and phenology charts survived only as captions.
  Maps are where the regional detail actually lives.
- **No tables** anywhere. Every number is a range inside a sentence.
- Running headers and footers repeat on every page (about 20 per file).
- Two-column pages were merged line by line in places. The 2022–2023 conclusions are
  the worst case: two paragraphs are zipped together word by word. Quote from the PDF,
  not the markdown, for anything that matters.
- In the 2025–2026 intro a body paragraph is spliced into the indicator list.
- The PDF page renderer and `pdfimages` are not installed here (`brew install poppler`
  would fix that), so the maps were not inspected.

## 3. Verdict

**Useful as domain knowledge and as a validation baseline. Not usable as a runtime data
feed.** The reports are retrospective, published after the season ends, regional, and
narrative. They contain no forecasts and not a single ANM warning code. AgroPlan's
loading screen promises four live checks (7-day forecast, soil moisture, sowing window,
ANM warnings); none of those come from these files. What the files give us is the
**vocabulary, thresholds and seasonal logic** that ANM itself uses, so that whatever live
feed we wire later speaks the same language the farmer already hears from ANM.

## 4. Concrete uses

### 4.1 Alert thresholds and scales, as ANM defines them

The five reports use the same classification scales every year. Adopting them verbatim
gives our Alerts a defensible, citable basis. Ranges below are as written in the reports;
confirm the exact class boundaries against ANM's methodology before coding them.

**Optimal sowing epoch for autumn cereals (rapeseed, barley, wheat): 15 September to
20 October**, identical in all five years. Sowings after 20 October are consistently
described as behind phenologically and at higher risk. The app's mock Sowing Window
("25 sept – 15 oct") sits inside this epoch. The real window should be a regional
narrowing of it.

Soil moisture reserve classes (mc/ha):

| Layer                     | Extreme / strong drought | Moderate drought | Satisfactory | Near optimum | Optimum   |
| ------------------------- | ------------------------ | ---------------- | ------------ | ------------ | --------- |
| 0–20 cm (ogor, at sowing) | 10–150                   | 150–200          | 200–300      | 300+         |           |
| 0–100 cm (wheat / maize)  | 320–650                  | 650–950          | 950–1250     | 1250–1650    | 1650–2040 |

Precipitation classes used for the periods that matter to a Sowing Plan:

| Period          | Why it matters               | Classes seen in the reports                        |
| --------------- | ---------------------------- | -------------------------------------------------- |
| One month       | monthly narrative            | reduced 1–25, normal 25–50, high 50–100 l/mp       |
| Sept–Oct        | sowing period                | low / very low under 80 l/mp (2023)                |
| 1 Nov – 31 Mar  | soil water accumulation      | deficit under 200 l/mp                             |
| May–June        | wheat's maximum water demand | secetos / moderat secetos when under ~100–150 l/mp |
| June–August     | maize's maximum water demand | deficit under 200 l/mp                             |
| 1 Sept – 31 Aug | whole agricultural year      | deficit under 600, optimum 600–700 l/mp            |

Thermal indices and critical thresholds:

- "Arșiță": days with Tmax ≥ 32 °C, accumulated as heat-stress units. Summer 2024 had
  31–80 such days; summer 2025 had 31–63 days and 51–230 units in the south.
- Winter severity: "unități de ger" summed Dec–Feb and "unități de frig" summed Nov–Mar.
  Under 10 ger units and under 200 frig units is a mild winter.
- Frost damage to autumn cereals appears at air minima of −10 to −20 °C on fields with
  no snow cover or a patchy 1–5 cm layer.
- "Indice de împrimăvărare": sum of daily mean temperatures from 1 February to 10 April,
  used to judge how early vegetation resumes.

### 4.2 Crop Calendar validation and extension

The reports give the phase-by-month sequence for each crop across five real years. For
winter wheat: germination, emergence, third leaf and tillering in October–November;
biological rest December–February with slow, temporary resumptions in the south; tillering
and stem elongation March–April; heading and flowering in May; milk, wax and full maturity
June–July; harvest in July. This matches the app's five calendar rows (sowing Sept–Oct,
emergence November, spring fertilisation March, treatments May–June, harvest July).

The same sequences exist for rapeseed and barley (the two other crops the wizard offers)
and for maize (the dashboard's sample plan), so the calendars for those crops can be
written from this data instead of invented.

### 4.3 Alert types and Romanian wording

The reports document what actually damages crops season after season. Beyond the three
alerts the prototype shows (drought in the window, suitable rain, ANM warning status),
they justify:

- late-sowing risk when the 0–20 cm layer is in drought at the start of the window;
- crusting and ponding after heavy rain at sowing (autumn 2024);
- frost without snow cover in winter;
- heat stress forcing maturity in June–August;
- hail and squalls in May–July.

The Romanian phrasing (secetă pedologică moderată / puternică / extremă, aprovizionare
satisfăcătoare cu apă, epoca optimă, băltiri) is ANM's own and should be reused in the
`agro` i18n namespace.

### 4.4 A five-year regional baseline for the sowing window

What Sept–Oct looked like at sowing time, per year, as summarised in the conclusions:

| Autumn | Sowing-period conditions                                                                          |
| ------ | ------------------------------------------------------------------------------------------------- |
| 2021   | Very dry to moderately dry in most regions; optimum only in S/SE Dobrogea, S/W Muntenia, Oltenia  |
| 2022   | September wet in most of the country, October dry; sowing difficult in the S, SE and E            |
| 2023   | Under 80 l/mp almost everywhere, 42–57 days without rain; moderate to extreme drought in S, SE, E |
| 2024   | Abundant rain, ponding and delayed work; deficits only in S and E Oltenia                         |
| 2025   | Mixed; satisfactory to optimum in most areas, moderate/strong drought in Banat and Crișana        |

This baseline has three uses: grounded demo content instead of invented mock data,
**test fixtures for alert rules** (would the drought alert have fired for a Dobrogea
plan in autumn 2023 and stayed silent in autumn 2024?), and a "years like this" context
line on a Sowing Plan.

The 2025–2026 report also states this autumn's starting point: on 31 August 2026 the
0–100 cm layer under non-irrigated maize was in moderate to extreme drought in almost
all regions, with satisfactory reserves only locally in W/NW/N Muntenia, S Transilvania
and SE Dobrogea. That is the soil the 2026 sowing window opens on.

### 4.5 Recommendation logic

The recurring failure modes are autumn drought at sowing and the May–June deficit in the
south and east. That supports ranking drought-tolerant crops and varieties higher for
Field Profiles in those regions and without irrigation. The reports treat non-irrigated
maize as its own case, which supports keeping the irrigation question in step 1.

### 4.6 Spatial model

The region taxonomy and the DMR station list give us the Region enum and a first list
of reference stations. They do not give a commune-to-region or commune-to-station
mapping, which the Field Profile (village/commune) needs.

## 5. What the data cannot do

- No forecasts, no warnings, no live values. It cannot drive an alert today.
- No county or commune resolution.
- No numbers as data: every value is a range in prose, and the maps are absent from the
  markdown.
- No variety information. Glosa, Pitar, Ursita and P0216 are never mentioned.
- Conversion errors mean the markdown is a reading copy, not a source of record.

## 6. Recommended next steps

1. Write `docs/anm-agromet-scales.md` (or extend `CONTEXT.md`) with the scales, critical
   periods and thresholds from section 4.1, each cited to report and year and verified
   against the PDF. Make it the source for alert thresholds.
2. Hand-extract a small structured dataset: year × region × period (sowing, accumulation,
   wheat May–June, maize June–August) with precipitation class and soil moisture class.
   About 160 rows. Use it as Vitest fixtures for the alert rules and as content for the
   baseline feature in 4.4.
3. Fill the Crop Calendars for barley, rapeseed and maize from the phenology sequences.
4. Add the Region enum and start the commune → region/station mapping from an external
   source (SIRUTA or a county list).
5. Separately research the live sources these reports summarise: ANM's weekly and decadal
   agrometeorological bulletins, soil moisture maps and the warnings feed. Those are what
   the loading screen promises.
6. `brew install poppler`, then extract the maps if we want them for docs or for the
   baseline feature. The PDFs are 3–6.5 MB each.
7. Decide what to commit. `sandbox/.gitignore` only ignores `data/`, so the 27 MB of PDFs
   and these markdown files are currently untracked but not ignored. Keep the PDFs out
   of git; keep the markdown and this report under `docs/` if they are meant to be shared.
