// Pure logic for matching a hop name from an order email to a hop that already
// exists in the user's Brewfather inventory. This is deliberately dependency
// free so it can be reasoned about and tested in isolation.

export type InventoryHop = {
  _id: string;
  name: string;
  inventory?: number;
  alpha?: number | null;
  year?: number | null;
  type?: string;
  origin?: string;
  supplier?: string;
};

export type HopMatch = {
  /** The matched inventory hop, or null when nothing cleared the threshold. */
  match: InventoryHop | null;
  /** Best similarity score in the range 0..1. */
  score: number;
  /** True when the runner-up scored almost as high (a coin-flip match). */
  ambiguous: boolean;
  /** The runner-up hop, populated only when `ambiguous` is true. */
  runnerUp?: InventoryHop;
};

// Descriptor words that refer to the *form* of the hop rather than its variety.
// Stripping these keeps "Citra Pellets T90" and "Citra" comparable.
const DESCRIPTOR_STOPWORDS = new Set([
  "pellet",
  "pellets",
  "t90",
  "t45",
  "leaf",
  "cryo",
  "hop",
  "hops",
  "whole",
  "organic",
  "bio",
  "lupomax",
]);

/**
 * Normalize a hop name into a canonical, comparable form:
 * lowercase, diacritics removed, parentheticals and alpha-acid percentages
 * dropped, form-descriptor words removed, and collapsed to single spaces.
 */
export function normalizeHopName(raw: string | null | undefined): string {
  // Inventory items can occasionally come back without a usable name; treat
  // those as empty so they simply never match rather than crashing.
  if (typeof raw !== "string") return "";
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // drop "(pellets)", "(2024)" etc.
    .replace(/\d+(\.\d+)?\s*%/g, " ") // drop "12.5%" alpha acids
    .replace(/\b(?:19|20)\d{2}\b/g, " ") // drop crop years; identity uses the year field
    .replace(/[^a-z0-9]+/g, " ") // non-alphanumerics -> space
    .split(" ")
    .filter((tok) => tok.length > 0 && !DESCRIPTOR_STOPWORDS.has(tok))
    .join(" ")
    .trim();
}

/**
 * Pull a crop year (19xx/20xx) out of a hop name, for inventory items whose
 * year is encoded in the name (e.g. "Citra 2025") rather than the year field.
 */
export function extractYearFromName(
  raw: string | null | undefined,
): number | undefined {
  if (typeof raw !== "string") return undefined;
  const match = raw.match(/\b(?:19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : undefined;
}

/** Similarity score in 0..1 between two already-normalized names. */
export function scoreMatch(aNorm: string, bNorm: string): number {
  if (!aNorm || !bNorm) return 0;
  if (aNorm === bNorm) return 1;

  const aTokens = new Set(aNorm.split(" "));
  const bTokens = new Set(bNorm.split(" "));

  let intersection = 0;
  for (const tok of aTokens) {
    if (bTokens.has(tok)) intersection++;
  }
  const union = new Set([...aTokens, ...bTokens]).size;
  let score = union > 0 ? intersection / union : 0;

  // Whole-string containment is a strong signal (e.g. "citra" in
  // "citra incognito"), so floor the score when one contains the other.
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) {
    score = Math.max(score, 0.85);
  }

  return score;
}

/**
 * Find the best inventory hop for a given order-email hop name.
 *
 * `threshold` is the minimum score required to consider it a real match;
 * anything below is treated as "not in inventory" and skipped by the caller.
 */
export function matchHop(
  queryName: string,
  inventory: InventoryHop[],
  threshold = 0.5,
): HopMatch {
  const query = normalizeHopName(queryName);

  let best: { hop: InventoryHop; score: number } | null = null;
  let second: { hop: InventoryHop; score: number } | null = null;

  for (const hop of inventory) {
    const score = scoreMatch(query, normalizeHopName(hop.name));
    if (!best || score > best.score) {
      second = best;
      best = { hop, score };
    } else if (!second || score > second.score) {
      second = { hop, score };
    }
  }

  if (!best || best.score < threshold) {
    return { match: null, score: best ? best.score : 0, ambiguous: false };
  }

  const ambiguous =
    !!second && second.score >= threshold && best.score - second.score < 0.1;

  return {
    match: best.hop,
    score: best.score,
    ambiguous,
    runnerUp: ambiguous && second ? second.hop : undefined,
  };
}
