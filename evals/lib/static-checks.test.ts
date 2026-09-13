// @vitest-environment node
import { describe, expect, it } from "vitest";

import { loadBriefs, loadCases, type LoadedCase } from "./dataset";
import { staticIssues } from "./static-checks";

const briefs = loadBriefs();
const cases = loadCases();

function caseNamed(id: string): LoadedCase {
  const found = cases.find((entry) => entry.case.id === id);
  if (!found) throw new Error(`No eval case ${id}`);
  return found;
}

/** A deep-enough clone so a mutation cannot leak into another test. */
function clone(entry: LoadedCase): LoadedCase {
  return { file: entry.file, case: structuredClone(entry.case) };
}

const CROPS = "crops-reviga-cernoziom-irrigated";
const LOW_DATA = "crops-cobadin-unknown-dryland";
const VARIETIES = "varieties-turda-grau-toamna-dryland";

describe("staticIssues", () => {
  it("passes a real case untouched", () => {
    expect(staticIssues(caseNamed(CROPS), briefs)).toEqual([]);
  });

  it("flags a file name that does not match the id", () => {
    const entry = clone(caseNamed(CROPS));
    entry.file = "crops-somewhere-else";
    expect(staticIssues(entry, briefs)).toEqual([
      expect.stringContaining("crops-somewhere-else"),
    ]);
  });

  it("flags a today that has drifted from the brief", () => {
    const entry = clone(caseNamed(CROPS));
    entry.case.today = "2026-09-14";
    expect(staticIssues(entry, briefs)).toEqual(
      expect.arrayContaining([expect.stringContaining('today "2026-09-14"')]),
    );
  });

  it("flags a missing brief", () => {
    const entry = clone(caseNamed(CROPS));
    entry.case.brief = "nowhere";
    expect(staticIssues(entry, briefs)).toEqual([
      expect.stringContaining('brief "nowhere"'),
    ]);
  });

  it("flags a crop id that is not in the dictionary", () => {
    const entry = clone(caseNamed(CROPS));
    entry.case.expect = { mustInclude: ["grau_de_toamna"] };
    expect(staticIssues(entry, briefs)).toEqual(
      expect.arrayContaining([expect.stringContaining('"grau_de_toamna"')]),
    );
  });

  it("flags an id that is not a candidate on the case date", () => {
    const entry = clone(caseNamed(CROPS));
    entry.case.expect = { mustInclude: ["porumb"] };
    expect(staticIssues(entry, briefs)).toEqual([
      expect.stringContaining('"porumb" is not a candidate on 2026-09-13'),
    ]);
  });

  it("flags a lowData flag that disagrees with the soil class", () => {
    const entry = clone(caseNamed(CROPS));
    entry.case.lowData = true;
    expect(staticIssues(entry, briefs)).toEqual(
      expect.arrayContaining([expect.stringContaining("cernoziom")]),
    );
  });

  it("flags a lowData case without a maxConfidence cap", () => {
    const entry = clone(caseNamed(LOW_DATA));
    delete entry.case.expect?.maxConfidence;
    expect(staticIssues(entry, briefs)).toEqual([
      expect.stringContaining("maxConfidence"),
    ]);
  });

  it("flags an unsatisfiable mustExclude", () => {
    const entry = clone(caseNamed(CROPS));
    entry.case.expect = {
      mustExclude: [
        "grau_toamna",
        "orz_toamna",
        "secara",
        "triticale",
        "rapita_toamna",
      ],
    };
    expect(staticIssues(entry, briefs)).toEqual(
      expect.arrayContaining([expect.stringContaining("no candidate")]),
    );
  });

  it("flags an invented variety name", () => {
    const entry = clone(caseNamed(VARIETIES));
    entry.case.expect = { topAny: ["Nadejdea"] };
    expect(staticIssues(entry, briefs)).toEqual([
      expect.stringContaining('"Nadejdea" is not a variety of grau_toamna'),
    ]);
  });

  it("flags crops keys on a varieties case", () => {
    const entry = clone(caseNamed(VARIETIES));
    entry.case.expect = { mustInclude: ["grau_toamna"] };
    expect(staticIssues(entry, briefs)).toEqual(
      expect.arrayContaining([expect.stringContaining("mustInclude")]),
    );
  });
});
