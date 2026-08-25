// Redis-backed idempotency store for the inventory sync.
//
// Each processed request is recorded under a key derived from a hash of the
// caller-supplied Idempotency-Key (e.g. the source email's Message-ID). Before
// applying any inventory changes we "claim" the key; a replay of the same key
// short-circuits instead of adding stock again.
//
// NOTE: The read-then-claim in the route is not atomic, so a very tight burst
// of identical requests could still slip a duplicate through before the claim
// is visible. This reliably stops re-processing of the same email across runs
// and bounds most loop scenarios.

import crypto from "crypto";

import { redis } from "@/lib/redis";

const PREFIX = "tapmenu:brewfather:idempotency:";
// A "processing" claim expires after this, so a crashed invocation doesn't
// block a genuine retry forever.
const STALE_MS = 10 * 60 * 1000;
// Completed records only need to outlive any plausible email replay.
const DONE_TTL_SECONDS = 90 * 24 * 60 * 60;

export type IdempotencyStatus = "processing" | "done";

export type IdempotencyRecord = {
  key: string;
  status: IdempotencyStatus;
  at: string; // ISO timestamp
  result?: unknown;
};

function redisKeyFor(key: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(key)
    .digest("hex")
    .slice(0, 40);
  return `${PREFIX}${hash}`;
}

export async function readRecord(
  key: string,
): Promise<IdempotencyRecord | null> {
  try {
    return await redis().get<IdempotencyRecord>(redisKeyFor(key));
  } catch {
    return null;
  }
}

/** Mark a key as in-progress before applying inventory changes. */
export async function claim(key: string): Promise<void> {
  const record: IdempotencyRecord = {
    key,
    status: "processing",
    at: new Date().toISOString(),
  };
  await redis().set(redisKeyFor(key), record, { px: STALE_MS });
}

/** Record the final result so replays can return it without re-applying. */
export async function complete(key: string, result: unknown): Promise<void> {
  const record: IdempotencyRecord = {
    key,
    status: "done",
    at: new Date().toISOString(),
    result,
  };
  await redis().set(redisKeyFor(key), record, { ex: DONE_TTL_SECONDS });
}

/** Remove a claim so a failed request can be retried later. */
export async function release(key: string): Promise<void> {
  try {
    await redis().del(redisKeyFor(key));
  } catch {
    // best effort; a stale claim expires on its own via STALE_MS
  }
}

export function isStale(record: IdempotencyRecord): boolean {
  return Date.now() - new Date(record.at).getTime() > STALE_MS;
}
