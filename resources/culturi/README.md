# Crop dictionary

`crop-dictionary.json` is the reference set of field crops that can be grown in Romania, with the agronomic requirements of each, read whole by the AI component so it can judge a crop against a parcel. Romanian pair: `README.ro.md`. Decision record: `docs/adr/0002-crop-dictionary-read-whole-by-the-model.md`. Terms: `CONTEXT.md`, section "Limbaj: dicționarul de culturi".

**Evidence class: desk-research finding.** Nothing in this file validates a hypothesis. It was compiled on 2026-09-12 from public sources by research agents and has not been reviewed by an agronomist.

## Shape

```
crops[]                     one entry per Cultură (species + sowing regime)
  id, name_ro, name_en, scientific_name, group, sowing_regime
  requirements
    soil        suitable_classes, unsuitable_classes, ph_range
    altitude_m
    drainage    waterlogging_tolerance, requires_drained_soil
    exposure
    precipitation  season_need_mm, critical_period, drought_tolerance
    temperature    germination_soil_c_min, optimal_growth_c, frost_tolerance_c_min, heat_critical_c
  calendar
    sowing_windows[]   zone as the source names it, from, to (MM-DD)
    sowing_condition, emergence_days, flowering_period, harvest_window, days_to_maturity
  rotation      good_preceding, bad_preceding (crop ids), years_before_repeat
  economics     yield_t_ha_rainfed, yield_t_ha_irrigated, cost_per_ha, min_viable_area_ha, coupled_support_eligible
  varieties[]   at most five Soi sau hibrid per crop: name, breeder, type, registered_year, maturity_class, drought_tolerance, recommended_zones, traits
```

Every leaf value is an object `{ "value": …, "source": "…", "verified": true|false }`.

## Rules the reader must apply

- `verified: true` means a Romanian primary public source states the value (INCDA Fundulea, ISTIS, MADR, INS TEMPO, ANM, USAMV course material, SCDA stations). `verified: false` means general agronomy knowledge, a non-Romanian source, or press. Cite the former plainly and the latter with a hedge.
- A missing field means no source gave a value. Say you do not know. Do not estimate.
- Irrigation available removes the `season_need_mm` requirement and changes nothing else.
- Sowing windows are published date ranges per zone, as the source names the zone. `sowing_condition` is the temperature check against the current year. Use both.
- The parcel is an exact location. Compare requirements against Open-Meteo actuals and history for that point, with ANM county warnings as an override. Zones matter only for picking the sowing window.
- Groups: `cereale`, `oleaginoase_industriale`, `leguminoase_furajere`. Horticulture is out of scope.

## Inputs the dictionary is matched against

Location (lat, lon), surface in ha, irrigation yes or no, date, soil class from a farmer tap (`cernoziom`, `lutos`, `argilos`, `nisipos`, or unknown), weather actuals and history from Open-Meteo, ANM warning code for the county.

## Validation

```
python3 -c "import json,jsonschema; jsonschema.validate(json.load(open('resources/culturi/crop-dictionary.json')), json.load(open('resources/culturi/crop-dictionary.schema.json'))); print('ok')"
```

## Known gaps

Listed at the end of `README.ro.md` under „Lipsuri cunoscute”, updated with the file. Headline items as of 2026-09-12: the file is ~145k tokens and the model reads all of it; no agronomist has reviewed it; sorg, secară, triticale, orez, grâu de primăvară, năut, linte, lucernă and trifoi rest mostly on press sources; spring barley and oat sowing dates are estimates around a sourced temperature condition; lentil has no registered variety in Romania; three varieties sold from the EU catalogue are not in ISTIS.
