// Pure unit-conversion helpers for Brewfather inventory updates.
// Brewfather stores hop inventory in grams, so every incoming amount is
// normalized to grams before it is sent to the API.

const UNIT_TO_GRAMS: Record<string, number> = {
  mg: 0.001,
  g: 1,
  gr: 1,
  gram: 1,
  grams: 1,
  gramme: 1,
  grammes: 1,
  kg: 1000,
  kilo: 1000,
  kilos: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.349523125,
  ounce: 28.349523125,
  ounces: 28.349523125,
  lb: 453.59237,
  lbs: 453.59237,
  pound: 453.59237,
  pounds: 453.59237,
};

/**
 * Convert an incoming amount + unit into grams.
 *
 * - `amount` may be a number (e.g. 100) or a numeric string (e.g. "100",
 *   "3.5", or a combined "100g" / "3.5 oz" when `unit` is omitted).
 * - `unit` is optional; when missing (and not embedded in the amount) the
 *   value is assumed to already be in grams.
 *
 * Throws a descriptive Error for anything it cannot confidently convert so the
 * caller can skip that item and report why, rather than sending bad data.
 */
export function parseAmountToGrams(
  amount: number | string,
  unit?: string
): number {
  let value: number;
  let resolvedUnit = (unit ?? "").trim().toLowerCase();

  if (typeof amount === "number") {
    value = amount;
  } else if (typeof amount === "string") {
    const match = amount
      .trim()
      .match(/^([+-]?\d*\.?\d+)\s*([a-zA-Z]*)$/);
    if (!match) {
      throw new Error(`Unrecognized amount: "${amount}"`);
    }
    value = parseFloat(match[1]);
    // If the caller didn't pass a unit, fall back to one embedded in the
    // string (e.g. "100g").
    if (!resolvedUnit && match[2]) {
      resolvedUnit = match[2].toLowerCase();
    }
  } else {
    throw new Error(`Unsupported amount type: ${typeof amount}`);
  }

  if (!Number.isFinite(value)) {
    throw new Error(`Amount is not a finite number: "${amount}"`);
  }

  if (!resolvedUnit) {
    resolvedUnit = "g"; // assume grams when no unit is provided
  }

  const factor = UNIT_TO_GRAMS[resolvedUnit];
  if (factor == null) {
    throw new Error(`Unsupported unit: "${unit ?? resolvedUnit}"`);
  }

  const grams = value * factor;
  // Keep a sensible precision; hops are typically whole grams.
  return Math.round(grams * 1000) / 1000;
}
