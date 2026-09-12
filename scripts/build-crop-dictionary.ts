/**
 * Build the compact Crop Dictionary the AI reads.
 *
 *   bun run build:crop-dictionary
 *
 * Reads `resources/culturi/crop-dictionary.json` (research file, every leaf
 * wrapped in `{ value, source, verified }`), strips the provenance and the
 * `economics` block (see `src/lib/agro/crop-dictionary-strip.ts`) and writes
 * `src/lib/agro/crop-dictionary.compact.json`, which is committed and imported
 * at runtime. Re-run whenever the research file changes.
 *
 * Excluded from `tsc` (see tsconfig "exclude"); runs under `bun run`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  RESEARCH_DICTIONARY_PATH,
  compactCropDictionary,
} from "../src/lib/agro/crop-dictionary-strip";

const OUTPUT_PATH = "src/lib/agro/crop-dictionary.compact.json";

const root = resolve(import.meta.dir, "..");
const inputPath = resolve(root, RESEARCH_DICTIONARY_PATH);
const outputPath = resolve(root, OUTPUT_PATH);

const research = JSON.parse(readFileSync(inputPath, "utf8"));
const compact = compactCropDictionary(research);
const json = JSON.stringify(compact, null, 2) + "\n";
writeFileSync(outputPath, json);

const inBytes = readFileSync(inputPath).byteLength;
console.log(
  `${OUTPUT_PATH}: ${compact.crops.length} crops, ${Math.round(inBytes / 1024)} KB -> ${Math.round(json.length / 1024)} KB`,
);
