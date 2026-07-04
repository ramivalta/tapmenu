// Thin Brewfather REST API v2 client scoped to the hop-inventory operations
// this feature needs. All amounts are in grams (Brewfather is metric).

import type { InventoryHop } from "./matching";

const BASE_URL = "https://api.brewfather.app/v2";
const PAGE_SIZE = 50;
const MAX_PAGES = 40; // safety cap: up to 2000 hops before we stop paginating

// The token is the base64-encoded `userid:apikey` Basic credential — the same
// value the rest of the app reads from BREWFATHER_API_TOKEN.
export type BrewfatherAuth = string;

export class BrewfatherError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "BrewfatherError";
    this.status = status;
    this.body = body;
  }
}

function authHeader(token: BrewfatherAuth): string {
  return `Basic ${token}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch every hop in the user's inventory, following Brewfather's
 * `start_after` cursor pagination so matching never runs against a truncated
 * list. `complete=true` is used so the `year` field (not a default field) is
 * present, since hop identity now depends on year and alpha.
 */
export async function fetchAllHops(
  token: BrewfatherAuth,
): Promise<InventoryHop[]> {
  const all: InventoryHop[] = [];
  let startAfter: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${BASE_URL}/inventory/hops`);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("complete", "true");
    if (startAfter) {
      url.searchParams.set("start_after", startAfter);
    }

    const res = await fetch(url, {
      headers: { authorization: authHeader(token) },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      throw new BrewfatherError(
        `Failed to list hop inventory (HTTP ${res.status})`,
        res.status,
        body,
      );
    }

    const batch = (await res.json()) as InventoryHop[];
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    all.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break; // last page
    }

    const last = batch[batch.length - 1];
    if (!last?._id) {
      break; // can't paginate further without a cursor
    }
    startAfter = last._id;
  }

  return all;
}

export type AdjustResult = {
  status: number;
  ok: boolean;
  body: string;
};

/**
 * Adjust a hop's stock by `gramsDelta` (positive to add, negative to remove).
 * Uses `inventory_adjust`, which Brewfather applies as a relative change and
 * never stores as a field on the item.
 *
 * Retries once on HTTP 429, honoring the `Retry-After` header.
 */
export async function adjustHopInventory(
  token: BrewfatherAuth,
  hopId: string,
  gramsDelta: number,
): Promise<AdjustResult> {
  const url = `${BASE_URL}/inventory/hops/${encodeURIComponent(hopId)}`;

  const send = () =>
    fetch(url, {
      method: "PATCH",
      headers: {
        authorization: authHeader(token),
        "content-type": "application/json",
      },
      body: JSON.stringify({ inventory_adjust: gramsDelta }),
      cache: "no-store",
    });

  let res = await send();

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitSeconds =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter, 10)
        : 2;
    await sleep(waitSeconds * 1000);
    res = await send();
  }

  const body = await res.text();
  return { status: res.status, ok: res.ok, body };
}

export type CreateHopInput = {
  name: string;
  /** Alpha acid %, stored only when known. */
  alpha?: number;
  /** Harvest year, stored only when known. */
  year?: number;
  /** Physical form — Brewfather "Hop Type" enum: Pellet, Leaf, Plug. */
  type?: string;
};

/**
 * Create a new hop inventory item and return its generated `_id`.
 *
 * Only `name` (and optional `alpha`) is sent; Brewfather ignores server-managed
 * inventory fields on create, so stock is applied afterwards with a separate
 * `adjustHopInventory` call.
 */
export async function createHop(
  token: BrewfatherAuth,
  input: CreateHopInput,
): Promise<string> {
  const url = `${BASE_URL}/inventory/hops`;

  const payload: Record<string, unknown> = { name: input.name };
  if (typeof input.alpha === "number" && Number.isFinite(input.alpha)) {
    payload.alpha = input.alpha;
  }
  if (typeof input.year === "number" && Number.isFinite(input.year)) {
    payload.year = input.year;
  }
  if (typeof input.type === "string" && input.type.trim()) {
    payload.type = input.type;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: authHeader(token),
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const body = await res.text();
  if (!res.ok) {
    throw new BrewfatherError(
      `Failed to create hop "${input.name}" (HTTP ${res.status})`,
      res.status,
      body,
    );
  }

  const id = parseCreatedId(body);
  if (!id) {
    throw new BrewfatherError(
      `Hop "${input.name}" was created but no id was returned.`,
      res.status,
      body,
    );
  }
  return id;
}

/**
 * The create endpoint returns the new `_id`. Depending on serialization that
 * can arrive as a bare JSON string ("abc"), an object ({ _id: "abc" }), or a
 * raw unquoted id, so accept all three.
 */
function parseCreatedId(body: string): string | null {
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed === "string" && parsed.trim()) {
      return parsed.trim();
    }
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const id = obj._id ?? obj.id;
      if (typeof id === "string" && id.trim()) {
        return id.trim();
      }
    }
  } catch {
    const trimmed = body.trim().replace(/^"|"$/g, "");
    if (trimmed) return trimmed;
  }
  return null;
}
