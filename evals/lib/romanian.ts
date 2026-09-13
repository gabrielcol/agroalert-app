/**
 * Two deliberately lenient text heuristics for the eval assertions
 * (`evals/README.md` § "Invariants", point 3). They answer "is this the
 * farmer-facing Romanian plain text the contract asks for?" without pretending
 * to be a language detector: a false negative would fail a correct answer, so
 * both err towards accepting.
 */

/** Romanian-only letters. Their presence alone settles the language. */
const ROMANIAN_DIACRITICS = /[ăâîșşțţ]/;

/**
 * Frequent Romanian function words, for text a model wrote without diacritics.
 * Matched as whole words, so "din" does not fire inside "dinamic".
 */
const ROMANIAN_STOPWORDS = [
  "și",
  "sau",
  "pentru",
  "este",
  "sunt",
  "în",
  "cu",
  "la",
  "de",
  "din",
  "pe",
  "nu",
  "care",
  "mai",
  "doar",
  "dar",
  "fără",
  "până",
  "prin",
  "după",
  "peste",
  "între",
  "dacă",
  "când",
  "necesar",
  "sezon",
  "solul",
  "ploaie",
  "parcela",
  "cultura",
] as const;

/**
 * English function words that have no Romanian homograph ("are" is left out:
 * it is Romanian for "has", as in "Trifoi are toleranță scăzută"). One of these as a
 * whole word vetoes the text even when it carries diacritics — that is how a
 * half-translated answer ("Solul reține apa and the rain") is caught.
 */
const ENGLISH_STOPWORDS = [
  "the",
  "and",
  "with",
  "for",
  "is",
  "of",
  "this",
] as const;

/** Lowercased letter-only words of a text, as a set for whole-word lookups. */
function wordsOf(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/\p{L}+/gu) ?? []);
}

/**
 * True when `text` reads as Romanian: a Romanian diacritic or a Romanian
 * stopword, and no English stopword. Sentence count and length are *not*
 * checked — the contract asks for 2-3 short sentences, but asserting that is
 * brittle and catches nothing a reader would call wrong.
 */
export function looksRomanian(text: string): boolean {
  const words = wordsOf(text);
  if (ENGLISH_STOPWORDS.some((word) => words.has(word))) return false;
  if (ROMANIAN_DIACRITICS.test(text.toLowerCase())) return true;
  return ROMANIAN_STOPWORDS.some((word) => words.has(word));
}

/**
 * True when `text` carries markdown syntax. The reasons are shown to a farmer
 * as plain sentences, so bold, code spans, headings and list bullets are all
 * wrong. `*` and `-` only count at the start of the string, where they would
 * render as a bullet; inside a sentence they are arithmetic or a dash.
 */
export function hasMarkdown(text: string): boolean {
  if (text.includes("**") || text.includes("`")) return true;
  return /^\s*(?:#|[-*] )/.test(text);
}
