---
status: accepted
---

# 0002. A full crop dictionary, read whole by the model, serves both a sowing call and a crop ranking

Date: 2026-09-12

## Context

ADR 0001 fixed the pitch on one call, "sow wheat on this parcel this week", with a static INCDA window for one crop. The mentoring session of 2026-09-12 (inbox/mentoring cu Ana Ungureanu.txt) proposed the other product shape: location, surface and irrigation in, a ranked top-3 of crops out, built on a curated dataset of crops with favourable and unfavourable condition intervals. The team decided to carry both into the pitch of 2026-09-13.

Both shapes need the same thing the repo did not have: agronomic requirements per crop, in a form the AI component can cite.

## Decision

Build `resources/culturi/crop-dictionary.json`, validated by `crop-dictionary.schema.json`:

- **All Romanian field crops**, in three groups (cereale, oleaginoase și industriale, leguminoase și furajere). Horticulture stays out, as in ADR 0001.
- **Cultură → Soi sau hibrid.** At most five varieties per crop, chosen drought-tolerance first, from the ISTIS official catalogue and other Romanian public sources. Breeder names are data, not endorsement.
- **Every leaf value carries `source` and `verified`.** `verified: true` only when a Romanian primary source states it. A value nobody could source is omitted, never estimated silently.
- **The model reads the whole file.** No deterministic filter sits in front of it for the pitch. Terms are Romanian (CONTEXT.md, "Limbaj: dicționarul de culturi"); JSON keys are English snake_case.
- **Sowing windows are the zones the source names**, not a fixed list, plus a temperature condition to check the current year. The parcel is an exact location, so climate is compared against Open-Meteo actuals and history, with ANM county warnings as override.
- **Irrigation available removes the water limitation** and changes nothing else.

## Considered options

- Wheat only, or wheat plus one alternative: rejected because the crop ranking screen needs a real set to rank.
- Deterministic filter before the model: rejected for the pitch on time; the eval playbook's "code first, judge second" rule still applies to the checks on the output, and a filter can be added after the pitch without changing the file.
- Variety classes without names: rejected; the team wants named varieties available in Romania.
- Regional or county threshold tables: rejected; the location is exact, so thresholds stay absolute and the weather data supplies the actuals.

## Consequences

- The file is a desk-research finding. Nothing in it validates a hypothesis, and the pitch must say so.
- With the model reading everything, two risks the eval playbook already names get larger: invented numbers and confidence the source does not earn. Every reason the model gives must quote a `source` from the file; the deterministic check "no invented numbers" applies to the dictionary as much as to the forecast.
- ADR 0001's "one call, three sourced reasons" contract and the eval playbook's "three options with odds" contract are still unreconciled. The dictionary does not depend on that choice; the demo and the eval cases do. Deferred by the team on 2026-09-12.
- Variety data ages yearly. `registered_year` and `source` per variety are there so a reader can tell how stale an entry is.
