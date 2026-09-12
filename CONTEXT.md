# AgroAlert — domain glossary

Canonical English terms used in code, with the Romanian term farmers see in the UI.
Glossary only: no implementation details.

| Term              | Romanian             | Meaning                                                                                                     |
| ----------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Crop**          | Cultură              | A species grown on the field: winter wheat, barley, rapeseed, maize.                                        |
| **Variety**       | Soi                  | A named cultivar of a Crop (Glosa, Pitar, Ursita for wheat; P0216 for maize).                               |
| **Field Profile** | Teren                | What the farmer tells us about their land: village/commune, land-size bucket, whether they can irrigate.    |
| **Sowing Plan**   | Plan de semănat      | Exactly one Crop + one Variety for a Field Profile, with a Sowing Window, a Crop Calendar and Alerts.       |
| **Sowing Window** | Fereastra de semănat | The date range in which sowing is recommended for the Plan's area, derived from the forecast.               |
| **Crop Calendar** | Calendarul culturii  | The month-by-month operations of a Sowing Plan (sowing, emergence, fertilisation, treatments, harvest).     |
| **Alert**         | Alertă               | A notification tied to a Sowing Plan: drought in the Sowing Window, suitable rain, ANM warning code status. |
| **Alert Channel** | Canal de alertă      | How a farmer receives Alerts for a Plan: SMS, phone call, or in-app notification. One channel per Plan.     |
| **ANM**           | ANM                  | Administrația Națională de Meteorologie, the national weather service whose warning codes Alerts relay.     |

## Notes

- The dashboard ("Culturile tale") lists **Sowing Plans**, not Crops: the same Crop can
  appear twice with different Varieties.
- "Recommended" marks the Crop or Variety that best fits the Field Profile; it is a
  suggestion, the farmer still chooses.
