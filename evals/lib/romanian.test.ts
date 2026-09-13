import { describe, expect, it } from "vitest";

import { hasMarkdown, looksRomanian } from "./romanian";

describe("looksRomanian", () => {
  it("accepts text carried by Romanian diacritics", () => {
    expect(looksRomanian("Solul reține apa necesară răsăririi.")).toBe(true);
  });

  it("accepts diacritic-free Romanian carried by stopwords", () => {
    expect(looksRomanian("Se seamana mai devreme, cu apa din sol.")).toBe(true);
  });

  it("rejects English", () => {
    expect(looksRomanian("The soil is good for winter wheat.")).toBe(false);
  });

  it("rejects Romanian text that leaks an English stopword", () => {
    expect(looksRomanian("Solul reține apa and the rain.")).toBe(false);
  });

  it("rejects text with neither marker", () => {
    expect(looksRomanian("Lorem ipsum dolor sit.")).toBe(false);
  });

  it.each([
    // Sentences Haiku 4.5 wrote on the first live run (issue 0022): "are" is
    // Romanian for "has" and must not veto; the third carries no diacritic.
    "Grâul de primăvară are toleranță scăzută la secetă; iunie cu deficit -70 mm este critic.",
    "Trifoi are toleranță scăzută la secetă; deficitele mai-iunie (195 mm) vor stresa plantele în anul I.",
    "Ploaie septembrie-septembrie doar 24,5 mm vs 450 mm sezon necesar, deficit hidric 425 mm neirigat.",
  ])("accepts live model output %j", (text) => {
    expect(looksRomanian(text)).toBe(true);
  });

  it("matches stopwords as whole words only", () => {
    // "Informații" contains "for", which must not count as English.
    expect(looksRomanian("Informații despre sol, nu despre altele.")).toBe(
      true,
    );
  });
});

describe("hasMarkdown", () => {
  it.each([
    ["**Grâu** de toamnă.", true],
    ["Vezi `cropId`.", true],
    ["# Titlu", true],
    ["- primul punct", true],
    ["* primul punct", true],
    ["Grâu de toamnă, fit 86.", false],
    ["Parcela are 5 * 3 hectare.", false],
  ])("hasMarkdown(%j) === %s", (text, expected) => {
    expect(hasMarkdown(text)).toBe(expected);
  });
});
