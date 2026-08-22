// Shaping a Brewfather batch into the display payload the menu clients use.
//
// Shared by the current-taps route and the archive route so both describe a
// beer identically — which means a display client needs exactly one model for
// "a beer we brewed", whether it is pouring now or in the back catalogue.
//
// Colour logic is deliberately resolved here rather than client-side: the
// style matching and HSL blending in `beerStyleColors` is non-trivial, and
// duplicating it in every client would guarantee they drift apart.

import { round } from "lodash";

import { getWaveColor, srmColors } from "@/app/beerStyleColors";

// Brewfather's hop `use` values, in the order they happen in a brew. Anything
// outside this list is appended in encounter order so a new use never silently
// disappears from the menu.
const HOP_USE_ORDER = [
  "Mash",
  "First Wort",
  "Boil",
  "Aroma",
  "Whirlpool",
  "Hopstand",
  "Dry Hop",
];

// A processing aid rather than an ingredient — the printed labels already hide
// it, so the menu does too.
const HIDDEN_FERMENTABLES = new Set(["Rice Hulls"]);

export type Hop = { name: string; amount: number | null };

export type HopGroup = { use: string; hops: Hop[] };

export type Beer = {
  id: string | null;
  name: string | null;
  style: string | null;
  abv: number | null;
  ibu: number | null;
  srm: number | null;
  /** Hex from the SRM scale, ready to use as-is. */
  color: string | null;
  /** HSL triple the wave background is tinted with, matching the web menu. */
  waveColor: { hue: number; saturation: number; lightness: number };
  brewedOn: string | null;
  keggedOn: string | null;
  untappd: { beerUrl: string; qrUrl: string } | null;
  hops: HopGroup[];
  fermentables: { name: string; amount: number | null }[];
  yeasts: { name: string; productId: string | null }[];
};

/**
 * Free-text fields arrive as empty or whitespace-only strings when nothing was
 * typed. Normalise to null so clients can test presence instead of rendering
 * an empty line.
 */
export function cleanText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * The SRM index can run past the end of the colour ramp on very dark beers,
 * which is how the web cards end up with an undefined background.
 */
function srmColor(estimatedColor: unknown): string | null {
  if (typeof estimatedColor !== "number" || Number.isNaN(estimatedColor)) {
    return null;
  }
  const index = Math.max(
    0,
    Math.min(Math.round(estimatedColor), srmColors.length - 1),
  );
  return srmColors[index];
}

/**
 * Untappd links live in the free-text batch notes. Same extraction the web
 * cards do: pull the first beer URL, then rebuild it as Untappd's QR
 * redirect, which is shorter — and therefore a coarser, easier-to-scan code.
 */
function untappdLinks(batchNotes: unknown): Beer["untappd"] {
  if (typeof batchNotes !== "string") {
    return null;
  }
  const beerUrl = batchNotes.match(/https:\/\/untappd.com\/b\/[^ ]*/g)?.[0];
  const beerId = beerUrl?.match(/b\/([^ ]*)/)?.[1]?.split("/")[1];
  if (!beerUrl || !beerId) {
    return null;
  }
  return { beerUrl, qrUrl: `https://untappd.com/qr/beer/${beerId}` };
}

/**
 * Group a recipe's hops by use, summing repeated additions of the same hop so
 * a variety added three times in the boil reads as one line with one total.
 */
function groupHops(recipeHops: unknown): HopGroup[] {
  if (!Array.isArray(recipeHops)) {
    return [];
  }

  const byUse = new Map<string, Map<string, Hop>>();

  for (const hop of recipeHops) {
    const name = cleanText(hop?.name);
    if (!name) {
      continue;
    }
    const use = cleanText(hop?.use) ?? "Other";

    if (!byUse.has(use)) {
      byUse.set(use, new Map());
    }
    const hops = byUse.get(use)!;
    // Key on id when present so two hops sharing a name but not a lot stay
    // separate, falling back to the name when Brewfather omits the id.
    const key = typeof hop?._id === "string" ? hop._id : name;
    const amount = typeof hop?.amount === "number" ? hop.amount : null;
    const existing = hops.get(key);

    if (existing) {
      existing.amount =
        existing.amount === null && amount === null
          ? null
          : round((existing.amount ?? 0) + (amount ?? 0), 1);
    } else {
      hops.set(key, { name, amount });
    }
  }

  const known = HOP_USE_ORDER.filter((use) => byUse.has(use));
  const rest = [...byUse.keys()].filter((use) => !HOP_USE_ORDER.includes(use));

  return [...known, ...rest].map((use) => ({
    use,
    hops: [...byUse.get(use)!.values()],
  }));
}

function isoDate(value: unknown): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Shape one Brewfather batch. Returns null when there is no batch to shape. */
export function shapeBeer(batch: any): Beer | null {
  if (!batch) {
    return null;
  }

  const style = cleanText(batch?.recipe?.style?.name);
  const [hue, saturation, lightness] = getWaveColor(
    style ?? "",
    batch?.estimatedColor,
  );

  const fermentables = Array.isArray(batch?.recipe?.fermentables)
    ? batch.recipe.fermentables
        .filter((f: any) => !HIDDEN_FERMENTABLES.has(f?.name))
        .map((f: any) => ({
          name: cleanText(f?.name),
          amount: typeof f?.amount === "number" ? f.amount : null,
        }))
        .filter(
          (f: {
            name: string | null;
          }): f is { name: string; amount: number | null } => f.name !== null,
        )
    : [];

  const yeasts = Array.isArray(batch?.recipe?.yeasts)
    ? batch.recipe.yeasts
        .map((y: any) => ({
          name: cleanText(y?.name),
          productId: cleanText(y?.productId),
        }))
        .filter(
          (y: {
            name: string | null;
            productId: string | null;
          }): y is { name: string; productId: string | null } =>
            y.name !== null,
        )
    : [];

  return {
    id: cleanText(batch?._id),
    name: cleanText(batch?.recipe?.name),
    style,
    abv:
      typeof batch?.measuredAbv === "number"
        ? round(batch.measuredAbv, 1)
        : null,
    ibu:
      typeof batch?.estimatedIbu === "number"
        ? round(batch.estimatedIbu)
        : null,
    srm:
      typeof batch?.estimatedColor === "number"
        ? round(batch.estimatedColor, 1)
        : null,
    color: srmColor(batch?.estimatedColor),
    waveColor: { hue, saturation, lightness },
    brewedOn: isoDate(batch?.brewDate),
    keggedOn: isoDate(batch?.bottlingDate),
    untappd: untappdLinks(batch?.batchNotes),
    hops: groupHops(batch?.recipe?.hops),
    fermentables,
    yeasts,
  };
}
