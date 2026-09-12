# Dicționar de culturi

`crop-dictionary.json` este setul de referință al culturilor de câmp cultivabile în România, cu cerințele agronomice ale fiecăreia, citit integral de componenta AI pentru a judeca o cultură față de un teren. Perechea în engleză: `README.md`. Decizia: `docs/adr/0002-crop-dictionary-read-whole-by-the-model.md`. Termenii: `CONTEXT.md`, secțiunea „Limbaj: dicționarul de culturi”.

**Clasă de evidență: constatare de cercetare de birou.** Nimic din acest fișier nu validează o ipoteză. A fost compilat pe 2026-09-12 din surse publice de agenți de cercetare și nu a fost revizuit de un agronom.

## Structură

```
crops[]                     o intrare per Cultură (specie + regim de semănat)
  id, name_ro, name_en, scientific_name, group, sowing_regime
  requirements
    soil        suitable_classes, unsuitable_classes, ph_range
    altitude_m
    drainage    waterlogging_tolerance, requires_drained_soil
    exposure
    precipitation  season_need_mm, critical_period, drought_tolerance
    temperature    germination_soil_c_min, optimal_growth_c, frost_tolerance_c_min, heat_critical_c
  calendar
    sowing_windows[]   zona așa cum o numește sursa, from, to (LL-ZZ)
    sowing_condition, emergence_days, flowering_period, harvest_window, days_to_maturity
  rotation      good_preceding, bad_preceding (id-uri de culturi), years_before_repeat
  economics     yield_t_ha_rainfed, yield_t_ha_irrigated, cost_per_ha, min_viable_area_ha, coupled_support_eligible
  varieties[]   cel mult cinci Soiuri sau hibrizi per cultură: name, breeder, type, registered_year, maturity_class, drought_tolerance, recommended_zones, traits
```

Fiecare valoare-frunză este un obiect `{ "value": …, "source": "…", "verified": true|false }`.

## Reguli pe care cititorul le aplică

- `verified: true` înseamnă că o sursă publică românească primară afirmă valoarea (INCDA Fundulea, ISTIS, MADR, INS TEMPO, ANM, cursuri USAMV, stațiuni SCDA). `verified: false` înseamnă cunoștințe agronomice generale, sursă străină sau presă. Prima se citează direct, a doua cu rezervă.
- Un câmp lipsă înseamnă că nicio sursă nu a dat valoarea. Spui că nu știi. Nu estimezi.
- Irigarea disponibilă anulează cerința `season_need_mm` și nu schimbă nimic altceva.
- Ferestrele de semănat sunt intervale publicate pe zone, cu zona așa cum o numește sursa. `sowing_condition` este verificarea de temperatură pentru anul curent. Se folosesc amândouă.
- Parcela este o locație exactă. Cerințele se compară cu datele Open-Meteo actuale și istorice pentru acel punct, cu avertizările ANM pe județ ca suprascriere. Zonele contează doar la alegerea ferestrei de semănat.
- Grupe: `cereale`, `oleaginoase_industriale`, `leguminoase_furajere`. Horticultura nu intră.

## Intrările față de care se potrivește dicționarul

Locație (lat, lon), suprafață în ha, irigare da sau nu, data, clasa de sol dintr-o atingere a fermierului (`cernoziom`, `lutos`, `argilos`, `nisipos` sau nu știu), date meteo actuale și istorice de la Open-Meteo, cod de avertizare ANM pentru județ.

## Validare

```
python3 -c "import json,jsonschema; jsonschema.validate(json.load(open('resources/culturi/crop-dictionary.json')), json.load(open('resources/culturi/crop-dictionary.schema.json'))); print('ok')"
```

## Lipsuri cunoscute

Se completează la asamblarea fișierului.

Starea la 2026-09-12, versiunea 1.0.0: 22 culturi, 1.146 valori cu sursă, dintre care 838 verificate și 308 neverificate.

- **Mărimea.** Fișierul are ~430 KB, aproximativ 145.000 de tokeni. Modelul îl citește integral, deci contextul trebuie să îl încapă. O variantă compactă, fără șirurile `source`, ar avea cam un sfert din mărime.
- **Nerevizuit de un agronom.** Compilat de agenți din surse publice. Valorile `verified: true` sunt citate din texte USAMV, INCDA, ISTIS, INS, APIA. Nimic nu a fost confirmat cu un specialist.
- **Culturi slab sursate.** Sorg, secară, triticale, orez, grâu de primăvară, năut, linte, lucernă și trifoi au puține sau zero valori verificate în cerințe: nu s-a găsit un text USAMV, INCDA sau MADR accesibil. Valorile vin din presă agricolă și sunt marcate ca atare.
- **Ferestre de semănat estimate.** Pentru orzoaică de primăvară și ovăz, datele calendaristice sunt estimări în jurul condiției de temperatură sursate; fiecare fereastră poartă o notă. Cânepa are ferestre doar din presă.
- **Linte fără soiuri.** Catalogul oficial ISTIS 2020, 2024 și 2025 nu conține nicio intrare pentru Lens culinaris. Se cultivă populații locale.
- **Soiuri neînregistrate în ISTIS.** DKC4098 (porumb), RGT Huggo și KWS Nemesis (sorg) se vând în România din catalogul comun UE; numele poartă `verified: false`. Izvor (grâu) a fost radiat la 2022-12-31 și rămâne comercializabil până la 2025-06-30. DK Exception (rapiță) a fost radiat la 2024-12-31, comercializabil până la 2027-06-30.
- **Soiuri lipsă din brief.** Aurora (mazăre), Ami, Lizica, Vera (fasole), Magnat, Cosmina (lucernă), Napoca Tetra (trifoi), Fundulea 21 și 32 (sorg), Florinda (in), Diana (cânepă) nu mai apar în catalog și au fost lăsate deoparte.
- **Sprijin cuplat.** Sorgul nu apare pe nicio listă de sprijin cuplat accesibilă agenților, deși brief-ul organizatorului îl numește. Înregistrat `false` cu notă. madr.ro este în spatele unui firewall; citările schemei vin din APIA și presă. Pentru mazăre, PD-11 numește „mazăre de grădină”, nu explicit mazărea de câmp.
- **Câmpuri rare.** `altitude_m` există pentru 6 culturi, `exposure` pentru 7, `min_viable_area_ha` pentru 3 (pragul de eligibilitate APIA, nu unul economic), `yield_t_ha_irrigated` pentru 6, `heat_critical_c` pentru 11, `season_need_mm` pentru 11. Un câmp lipsă înseamnă că nicio sursă nu l-a dat.
- **Costuri.** `cost_per_ha` pentru 12 culturi, toate din presă (Revista Ferma, Agrointeligența), cele mai multe ca pachet generic „cultură mare” de 5.000-6.100 lei/ha, nu pe cultură.
- **Recoltarea perenelor.** Pentru lucernă și trifoi, momentul primei coase este descris în `notes`, nu în `harvest_window`, pentru că sursele dau fenologie, nu date.
- **Catalogul 2026.** Există (Ordin MADR 147/2026), dar PDF-ul nu a fost găsit; s-a folosit ediția 2025, cu reverificări în 2026 unde a fost posibil.
