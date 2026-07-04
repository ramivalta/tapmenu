// POST /api/brewfather/inventory
//
// Receives hops extracted from an order-confirmation email (by the Apple
// Shortcut's on-device model) and adds them to the user's Brewfather hop
// inventory. The server does the heavy lifting that is painful in Shortcuts:
// fetching the current inventory, matching names to inventory IDs, converting
// units to grams, and issuing one PATCH per hop.
//
// Auth: requires the shared PASSWORD secret (the same one used to update the
// tap menu) supplied by the caller as `Authorization: Bearer <secret>` or
// `x-sync-secret: <secret>`. This endpoint mutates external data, so it fails
// closed if the secret or Brewfather credentials are not configured.

import crypto from "crypto";

import { NextRequest, NextResponse } from "next/server";

import {
  adjustHopInventory,
  BrewfatherError,
  createHop,
  fetchAllHops,
} from "@/lib/brewfather/client";
import {
  claim,
  complete,
  isStale,
  readRecord,
  release,
} from "@/lib/brewfather/idempotency";
import { extractYearFromName, matchHop } from "@/lib/brewfather/matching";
import { parseAmountToGrams } from "@/lib/brewfather/units";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hops from the shop are pellets; default new inventory items to that form.
// (Brewfather's hop `type` field is the physical form: Pellet, Leaf, Plug.)
const DEFAULT_HOP_FORM = "Pellet";

type IncomingHop = {
  name: string;
  amount: number | string;
  unit?: string;
  type?: string;
  alpha?: number | string;
  year?: number | string;
};

type ResultRow = {
  input: string;
  status:
    | "updated"
    | "created"
    | "matched (dry run)"
    | "would create (dry run)"
    | "skipped"
    | "error";
  matched?: string;
  matchedId?: string;
  grams?: number;
  score?: number;
  alpha?: number;
  year?: number;
  warning?: string;
  reason?: string;
};

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// Real hop alpha acids top out well under this; anything higher is almost
// certainly noise (a harvest year like 2025, a lot number, etc.).
const MAX_PLAUSIBLE_ALPHA = 30;

/**
 * Parse an optional alpha-acid value, accepting numbers, "12.5", or "12.5%".
 * Values outside a plausible 0–30% range are rejected so harvest years and
 * similar noise don't get stored as alpha.
 */
function parseAlpha(raw: unknown): number | undefined {
  let n: number | undefined;
  if (typeof raw === "number") {
    n = raw;
  } else if (typeof raw === "string") {
    n = parseFloat(raw.trim().replace(/%$/, "").trim());
  }
  if (n === undefined || !Number.isFinite(n)) return undefined;
  if (n <= 0 || n > MAX_PLAUSIBLE_ALPHA) return undefined;
  return n;
}

/** True when an alpha value was supplied but rejected as implausible. */
function alphaWasIgnored(raw: unknown): boolean {
  const provided =
    (typeof raw === "number" && Number.isFinite(raw)) ||
    (typeof raw === "string" && raw.trim().length > 0);
  return provided && parseAlpha(raw) === undefined;
}

// Plausible harvest-year window: hops don't get labeled with years far from now.
const MIN_PLAUSIBLE_YEAR = 2000;
const MAX_PLAUSIBLE_YEAR = new Date().getFullYear() + 1;

/**
 * Parse an optional harvest year, accepting numbers or strings like "2025".
 * Values outside a plausible window are rejected so stray numbers don't get
 * stored as a year.
 */
function parseYear(raw: unknown): number | undefined {
  let n: number | undefined;
  if (typeof raw === "number") {
    n = raw;
  } else if (typeof raw === "string") {
    n = parseInt(raw.trim(), 10);
  }
  if (n === undefined || !Number.isInteger(n)) return undefined;
  if (n < MIN_PLAUSIBLE_YEAR || n > MAX_PLAUSIBLE_YEAR) return undefined;
  return n;
}

/** True when a year value was supplied but rejected as implausible. */
function yearWasIgnored(raw: unknown): boolean {
  const provided =
    (typeof raw === "number" && Number.isFinite(raw)) ||
    (typeof raw === "string" && raw.trim().length > 0);
  return provided && parseYear(raw) === undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/**
 * A year "conflicts" only when both sides are known and differ. An unknown on
 * either side is not treated as a difference, so a restock whose email omits
 * the year still matches an existing lot.
 */
function yearConflicts(
  incoming: number | undefined,
  existing: number | undefined,
): boolean {
  if (incoming === undefined || existing === undefined) return false;
  return incoming !== existing;
}

/** Same rule as years; a small tolerance absorbs float noise. */
function alphaConflicts(
  incoming: number | undefined,
  existing: number | undefined,
): boolean {
  if (incoming === undefined || existing === undefined) return false;
  return Math.abs(incoming - existing) > 0.01;
}

function truncate(s: string, max = 300): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Timing-safe string comparison that never short-circuits on length. */
function secretsMatch(provided: string, expected: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(provided);
  const b = encoder.encode(expected);
  if (a.length !== b.length) {
    // Still run a comparison to keep timing roughly constant.
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function getProvidedSecret(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }
  const header = req.headers.get("x-sync-secret");
  return header ? header.trim() : null;
}

/**
 * Resolve the idempotency key from the `Idempotency-Key` header (preferred) or
 * a `messageId` / `idempotencyKey` field in the body. Returns null when none is
 * supplied, in which case duplicate protection is skipped.
 */
function getIdempotencyKey(req: NextRequest, body: unknown): string | null {
  const header =
    req.headers.get("idempotency-key") ?? req.headers.get("x-idempotency-key");
  if (header && header.trim()) return header.trim();

  const b = body as Record<string, unknown> | null;
  const fromBody = b?.messageId ?? b?.idempotencyKey;
  if (typeof fromBody === "string" && fromBody.trim()) {
    return fromBody.trim();
  }
  return null;
}

function extractHops(body: unknown): IncomingHop[] {
  const raw = Array.isArray(body)
    ? body
    : Array.isArray((body as Record<string, unknown>)?.hops)
      ? (body as { hops: unknown[] }).hops
      : Array.isArray((body as Record<string, unknown>)?.items)
        ? (body as { items: unknown[] }).items
        : Array.isArray((body as Record<string, unknown>)?.ingredients)
          ? (body as { ingredients: unknown[] }).ingredients
          : null;

  if (!raw) return [];

  return raw.filter(
    (x): x is IncomingHop =>
      typeof x === "object" &&
      x !== null &&
      typeof (x as IncomingHop).name === "string" &&
      (x as IncomingHop).name.trim().length > 0,
  );
}

export async function POST(req: NextRequest) {
  // --- Auth / configuration (fail closed) ---
  // Reuses the same PASSWORD secret that gates tap-menu updates.
  const secret = process.env.PASSWORD;
  if (!secret) {
    return json(500, {
      error: "Server not configured: PASSWORD is not set.",
    });
  }

  const provided = getProvidedSecret(req);
  if (!provided || !secretsMatch(provided, secret)) {
    return json(401, { error: "Unauthorized." });
  }

  // Same base64 `userid:apikey` token the rest of the app uses.
  const token = process.env.BREWFATHER_API_TOKEN;
  if (!token) {
    return json(500, {
      error: "Server not configured: BREWFATHER_API_TOKEN is not set.",
    });
  }

  // --- Parse request ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const dryRunParam = req.nextUrl.searchParams.get("dryRun");
  const dryRun =
    (body as Record<string, unknown>)?.dryRun === true ||
    dryRunParam === "true" ||
    dryRunParam === "1";

  const hops = extractHops(body);
  if (hops.length === 0) {
    return json(400, {
      error: "No hop items found in request body.",
      hint: 'Send an array of {name, amount, unit} or {"hops": [...]}.',
    });
  }

  // --- Idempotency (skipped for dry runs, which never mutate) ---
  const idempotencyKey = dryRun ? null : getIdempotencyKey(req, body);
  const warnings: string[] = [];
  let claimed = false;

  if (idempotencyKey) {
    try {
      const existing = await readRecord(idempotencyKey);
      if (
        existing &&
        !(existing.status === "processing" && isStale(existing))
      ) {
        if (existing.status === "done") {
          return json(200, {
            duplicate: true,
            message:
              "Duplicate request ignored; returning the original result.",
            original: existing.result,
          });
        }
        return json(200, {
          duplicate: true,
          inProgress: true,
          message:
            "A request with this Idempotency-Key is already being processed; skipped to avoid double-counting.",
        });
      }
      await claim(idempotencyKey);
      claimed = true;
    } catch {
      warnings.push(
        "Idempotency store unavailable; proceeding without duplicate protection.",
      );
    }
  } else if (!dryRun) {
    warnings.push(
      "No Idempotency-Key provided; duplicate protection is disabled for this request.",
    );
  }

  // --- Fetch current inventory for matching ---
  let inventory;
  try {
    inventory = await fetchAllHops(token);
  } catch (e) {
    if (claimed && idempotencyKey) await release(idempotencyKey);
    if (e instanceof BrewfatherError) {
      return json(502, {
        error: "Could not read Brewfather hop inventory.",
        brewfatherStatus: e.status,
        detail: truncate(e.body),
      });
    }
    return json(502, {
      error: "Could not read Brewfather hop inventory.",
      detail: e instanceof Error ? e.message : String(e),
    });
  }

  // Only match against hops that currently have stock. Brewfather can't delete
  // hops from its UI, so a used-up (0 g) hop lingers forever; treating it as
  // absent means a new order creates a fresh entry instead of restocking a
  // defunct near-match.
  const matchableInventory = inventory.filter(
    (h) => typeof h.inventory === "number" && h.inventory > 0,
  );

  // --- Process each hop ---
  const results: ResultRow[] = [];
  let updated = 0;
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of hops) {
    const typeStr = item.type ? String(item.type).toLowerCase() : "";
    if (typeStr && typeStr !== "hops" && typeStr !== "hop") {
      results.push({
        input: item.name,
        status: "skipped",
        reason: `Unsupported ingredient type "${item.type}".`,
      });
      skipped++;
      continue;
    }

    let grams: number;
    try {
      grams = parseAmountToGrams(item.amount, item.unit);
    } catch (e) {
      results.push({
        input: item.name,
        status: "skipped",
        reason: e instanceof Error ? e.message : String(e),
      });
      skipped++;
      continue;
    }

    const alpha = parseAlpha(item.alpha);
    // Prefer the structured year; fall back to a year embedded in the name.
    const year = parseYear(item.year) ?? extractYearFromName(item.name);

    // Treat hops as the same lot only when the variety name matches AND neither
    // year nor alpha conflicts. Different (known) years or alphas of the same
    // variety are kept distinct. Existing items may carry the year in the name.
    const candidates = matchableInventory.filter((h) => {
      const existingYear = asNumber(h.year) ?? extractYearFromName(h.name);
      return (
        !yearConflicts(year, existingYear) &&
        !alphaConflicts(alpha, asNumber(h.alpha))
      );
    });

    const m = matchHop(item.name, candidates);
    if (!m.match) {
      // Not in inventory yet: create the hop, then apply the stock.
      const row: ResultRow = {
        input: item.name,
        grams,
        score: round(m.score),
        status: "skipped",
      };
      const ignored: string[] = [];
      if (typeof alpha === "number") {
        row.alpha = alpha;
      } else if (alphaWasIgnored(item.alpha)) {
        ignored.push(`alpha "${item.alpha}"`);
      }
      if (typeof year === "number") {
        row.year = year;
      } else if (yearWasIgnored(item.year)) {
        ignored.push(`year "${item.year}"`);
      }
      if (ignored.length > 0) {
        row.warning = `Ignored implausible ${ignored.join(" and ")}; set manually in Brewfather.`;
      }

      if (dryRun) {
        row.status = "would create (dry run)";
        results.push(row);
        continue;
      }

      try {
        const newId = await createHop(token, {
          name: item.name,
          alpha,
          year,
          type: DEFAULT_HOP_FORM,
        });
        const resp = await adjustHopInventory(token, newId, grams);
        if (resp.ok) {
          row.status = "created";
          row.matched = item.name;
          row.matchedId = newId;
          created++;
        } else {
          row.status = "error";
          row.matchedId = newId;
          row.reason = `Created hop but stock update failed (HTTP ${resp.status}): ${truncate(resp.body)}`;
          failed++;
        }
      } catch (e) {
        row.status = "error";
        row.reason =
          e instanceof BrewfatherError
            ? `Create failed (HTTP ${e.status}): ${truncate(e.body)}`
            : e instanceof Error
              ? e.message
              : String(e);
        failed++;
      }
      results.push(row);
      continue;
    }

    const row: ResultRow = {
      input: item.name,
      matched: m.match.name,
      matchedId: m.match._id,
      grams,
      score: round(m.score),
      status: "skipped",
    };
    if (m.ambiguous && m.runnerUp) {
      row.warning = `Ambiguous match (runner-up: "${m.runnerUp.name}").`;
    }

    if (dryRun) {
      row.status = "matched (dry run)";
      results.push(row);
      continue;
    }

    try {
      const resp = await adjustHopInventory(token, m.match._id, grams);
      if (resp.ok) {
        row.status = "updated";
        updated++;
      } else {
        row.status = "error";
        row.reason = `Brewfather PATCH failed (HTTP ${resp.status}): ${truncate(resp.body)}`;
        failed++;
      }
    } catch (e) {
      row.status = "error";
      row.reason = e instanceof Error ? e.message : String(e);
      failed++;
    }
    results.push(row);
  }

  const responseBody: {
    dryRun: boolean;
    inventoryCount: number;
    matchableCount: number;
    summary: {
      total: number;
      updated: number;
      created: number;
      skipped: number;
      failed: number;
    };
    results: ResultRow[];
    warnings?: string[];
  } = {
    dryRun,
    inventoryCount: inventory.length,
    matchableCount: matchableInventory.length,
    summary: { total: hops.length, updated, created, skipped, failed },
    results,
  };
  if (warnings.length) {
    responseBody.warnings = warnings;
  }

  // Record the outcome so a replay of this key returns it instead of
  // re-applying the stock changes.
  if (claimed && idempotencyKey) {
    try {
      await complete(idempotencyKey, responseBody);
    } catch {
      responseBody.warnings = [
        ...(responseBody.warnings ?? []),
        "Could not persist idempotency record; a replay of this key may re-apply.",
      ];
    }
  }

  return json(200, responseBody);
}
