# 0001. The hackathon use case is a sowing call, not an irrigation alert

Date: 2026-09-12
Status: accepted

## Context

The idea entered the hackathon as a companion whose headline feature was a hyper-local "irrigate now" alert. Two rounds of desk research and the first interview changed the picture:

- About 1.0 M ha of 9 M ha arable is under irrigation contract; 0.5-0.75 M ha is actually watered. An irrigate alert is actionable on roughly 6-11% of arable land (H6, evidence/supporting/product.md, evidence/round-2/product.md).
- The one farmer interviewed, a Dryland Cereal Farmer in Ialomița, follows ANM every other day, was not surprised by the drought, and cannot act on an irrigation call: his system is broken and ANIF could not guarantee water. He asked instead for calls on sowing, herbicide, plowing, harvest, and warnings (interviews/01-eng-vasile-outcomes.md).
- Round 2 found five things a dryland farmer does with a dry-spell warning; shifting the sowing date is the one that is live in September (INCDA Fundulea, Revista Ferma 2026-05-28).
- The organiser's criteria require a working AI component evaluated live, a persona from real interviews, open data, no new infrastructure, and a measurable impact. They do not require an irrigation feature.

The pitch is on 2026-09-13 with about one working day left.

## Decision

Follow the **Dryland Cereal Farmer** (see CONTEXT.md) and the reframed **H6**: a parcel-level dry-spell call changes a concrete decision for a cereal farmer who cannot irrigate.

Build one use case: **"Should I sow wheat on this parcel this week?"** The AI component turns four open inputs (ECMWF via Open-Meteo 0-7 day forecast, a Sentinel-2/SMAP soil-moisture proxy, ANM warnings from data.gov.ro, INCDA sowing-window guidance) into one call with stated reasons and named sources, on a phone browser with no account.

Out of scope for the pitch: irrigation alerts, photo diagnosis, news feed, WhatsApp delivery, pricing.

## Consequences

- The demo can be tested against a real parcel (Reviga, Ialomița) and a real farmer's stated alternative, which is the H6 test itself.
- The product no longer promises anything past 7 days and does not depend on ANM's agrometeo bulletin, which is not open data. **Amended 2026-09-12**: the Forecast now runs 16 days with the first 7 trusted, and a low-confidence Seasonal Outlook to 46 days is shown as tendency only — see ADR 0003.
- The horticulture segment, where an irrigation alert would have been actionable, is deferred. It has no interview behind it.
- If farmers say they sow when they always sow, or when the neighbour does, the hypothesis fails and the companion has no product for most Romanian farmland. That outcome is reported, not hidden.
- Reversing this after the pitch means re-deriving the persona and the data pipeline; the jury will have judged this framing.
