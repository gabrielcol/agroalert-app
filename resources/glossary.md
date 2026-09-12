# Glossary

Terms, tools and data sources the team meets in its sources. `Heard as` lists the spellings automatic transcripts produce.

**Source note.** Unless an entry says otherwise, it comes from the Daria Preda interview of 2026-09-12 and is unconfirmed against a vendor or primary source. Treat a figure here as what she said, not as a verified fact. Names she spoke aloud (Riso Scotti, Esri Living Atlas, Superset) are spelling reconstructions.

`CONTEXT.md` holds the audience language - the words the team uses when it writes about farmers. This file holds the technical vocabulary.

## Organisations and products

**CarbonFarm** The startup Daria Preda works for. It reads rice-crop condition from satellite data and sells carbon credits on the practices it verifies. It works with rice farmers, about 70% in East Asia (Vietnam, Indonesia, the Philippines, India), plus Spain, Italy, some of France, Africa, and a few farmers in the Americas. _Heard as_: Carbon Farm.

**Riso Scotti** The largest rice buyer Daria named in Italy. A buyer of this size runs its own app for the farmers it buys from. _Heard as_: Rizoscoti, Rizos Coti.

**Crop360** Agricover's platform, built by Agricover Technology with Microsoft. A farmer who imports his parcels from APIA can monitor crop growth stage and plant health from satellite imagery and get a set of vegetation indices. The closest thing to a direct competitor the team has found. _Source: round-2 desk research, not the interview._

**Terrasigna** Romanian Earth-observation company. Its AGRI-BIS service sells high-resolution thematic maps for plant health, crop development status and soil. _Source: round-2 desk research, not the interview._

**AI4AGRI** A EUR 1,412,360 EU project (Oct 2022 - Sep 2025) coordinated by Universitatea Transilvania din Brasov, built to create a research centre for AI on Earth-observation data in agriculture and to give Romanian farmers vegetation-status maps from free Copernicus data. _Source: round-2 desk research, not the interview._

**ESA - European Space Agency** Runs the Sentinel satellites and the Copernicus programme. _Heard as_: SA, Uniunea Europeană Spațială.

## Data sources

**Sentinel-1** ESA radar satellite. Daria said it reads water level, the top layer of soil, and plant size. CarbonFarm uses its signal to read irrigation. (That radar also penetrates cloud is general knowledge, not her statement.) _Heard as_: centinel 1, Xentinel One.

**Sentinel-2** ESA optical satellite. Free imagery at 10-metre resolution. Cloud blocks it. _Heard as_: centenelul 2, sentiel 2.

**Copernicus Data Space** ESA web portal. Browse the most recent Sentinel imagery, draw a polygon, build a time series, no code needed. Daria's recommendation for a team that does not want to write code. _Heard as_: copernic cu data space, Popernicus Dataspace.

**Google Earth Engine** Cloud platform for satellite imagery. Write a few lines of code, get a map fast. Daria's recommendation for a team that will process the data. _Heard as_: Google ore encai, Google or te engine.

**Esri Living Atlas** Map catalogue for looking at imagery without processing it. _Heard as_: Ezry Living Atlas, numeste intry living attezi.

**Planet** Another satellite constellation, commercial and paid. The Copernicus product Daria demonstrated was built by ESA together with Planet. She said nothing about its resolution.

**Drone** The higher-resolution alternative she named for reading a field, and the expensive one: "dacă ai o grămadă de bani, dai drona."

**Weather API** Any general weather data service. Gives wind, temperature, forecasts one to two months out. Some are open source. Not tuned to any one region. _Heard as_: Wather APIs, Weather APIs.

## Measures and methods

**Vegetation index** A number computed from optical satellite bands that says what stage a crop is at and whether it is healthy. It falls when the crop has an obvious health problem. _Heard as_: indexul de vegetație, indexul de vetare.

**Moisture index** A satellite-derived number that shows whether a field is irrigated. Red means nothing is growing. _Heard as_: indexul de umiditate.

**Calibration** Take a general model or a global API, then correct it with local measurements - a weather station, an in-soil sensor, a research centre's data. The standard way the industry gets a usable local prediction. CarbonFarm does this, and so do the research centres in large agricultural regions.

**Time series / timelapse** The same field seen across a season, so the crop's curve is visible. Copernicus Data Space builds one after you log in.

## Field terms

**Proxy user** Someone who uses the app on the farmer's behalf. About 80-90% of CarbonFarm's mobile app users are proxy users. They are close to the farmer - often former farmers - and visit his home and his fields.

**Field agent / technician** The cooperative staff member who visits farmers, trains them, photographs fields with geotags, and enters the data. The typical proxy user.

**Cooperative** The unit farmers are organised in where the political context requires it, for example Vietnam. One cooperative may hold around 100 farmers and employ several field agents.

**Carbon credit** What CarbonFarm sells. To earn one, a farmer must prove a sustainable practice - for rice, using less water, which cuts emissions. Proving it demands rigorous data: the date of each fertilisation, what happened before planting, what happened before harvest.

**Gateway** The field device that carries an IoT sensor, a SIM card and a battery, and sends sensor readings back. CarbonFarm runs these. Cameras were considered and dropped: harder to connect, battery-hungry, and she judged they would be stolen. Sensors actually were stolen, in Spain.

**Superset** Apache Superset. The dashboard tool CarbonFarm uses internally. Clients do not have access to it.

## AI evaluation

**Source note.** Every entry in this section comes from Workshop 3 of the Civic Producthon, taught by Mădălina Turlea of Lovelaice on 2026-09-12. Transcript: `inbox/2026-09-12-training-madalina-evals.txt`. Counts come from `inbox/2026-09-12-lovelaice-annotations-export.json`, which outranks the spoken word. The write-up is `projects/team-8-assignments/15-eval-playbook.html` and its Romanian pair `16-ghid-evaluare.html`.

**Eval** A test of an AI feature's output quality. Needed because an AI feature always answers, so its failures are silent rather than loud, and because "good" means something different for every product. _Heard as_: ival, evalz, ivalți, eaiurizi.

**Eval rubric** The written definition of a good answer for one product, expressed as a set of checks. Built from failure patterns found by reading real answers, never guessed in advance. _Heard as_: ival rubric, rubrică.

**Failure pattern** A category of error found by clustering annotation notes. Categories must be mutually exclusive. Each one becomes a metric. _Heard as_: peatern, patern, failure patterns.

**Deterministic check** A small function that returns 0 to 1 on one property of an output - all sections present, valid JSON, a URL found, no text outside the structure. Costs no tokens, needs no validation of its own. The default choice. _Heard as_: deterministic chex, metrici deterministe.

**LLM judge** A second AI scoring the first one's output. Only for what code cannot decide. An unvalidated judge invents its own definition of good; one judge scoring many criteria performs worse than one check per error. Run at temperature 0. _Heard as_: LLM George, EI geci, LLM Gehaj.

**Annotation** Reading each response and marking pass or fail with a specific written note. Done blind - the model name is hidden so preference does not bias the rating. The task belongs to whoever is the product expert. _Heard as_: anotare, anătături, anotăm.

**System prompt** The instructions that set an AI feature's behaviour, task and output. Structured in Markdown as a hierarchy: role and identity, context, objective, success criteria, input shape, output format, examples, edge cases and error handling. Mădălina called it a product specification, not engineering work. _Heard as_: sistem pront, prontul, sistem front, sistem propri.

**Few-shot prompting** Putting worked examples in the prompt so the model sees what a good answer looks like. Build them from real failures if you have none at the start. _Heard as_: Fushort Prompting.

**Temperature** The parameter that sets how much variation the model allows when picking its next token. Lovelaice defaults to 0.7. Temperature 0 narrows the variation but does **not** make the model deterministic. Newer models drop it for reasoning effort. _Heard as_: tematura, temperatul, temperatori.

**Context engineering** Shaping the non-prompt input a feature receives - product documents, files, images, retrieved passages. Wrong, incomplete or contradictory context is itself a failure source, and is the second lever for fixing a failure, alongside the prompt.

**Lovelaice** The AI evaluation platform Mădălina co-founded, used for the workshop. Runs one prompt across many models and test cases, hides model identity during review, collects pass/fail annotations, and generates metric functions from a plain-language description. Lists 289 models. _Heard as_: Lovelace, lovelist, lofful, Lovless, la place, blogului.

**Lovable** The prototyping tool the hackathon teams built in. It writes a system prompt for the AI feature it generates; that prompt is the starting point for evaluation. _Heard as_: WebRul, lăvopolș.

**Agent (Lovelaice)** One AI feature inside Lovelaice: one prompt, its test cases, its runs. The unit you come back to on every iteration.
