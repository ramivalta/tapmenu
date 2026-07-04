// Blob-backed idempotency store for the inventory sync.
//
// Each processed request is recorded as a single small blob keyed by a hash of
// the caller-supplied Idempotency-Key (e.g. the source email's Message-ID).
// Before applying any inventory changes we "claim" the key; a replay of the
// same key short-circuits instead of adding stock again.
//
// NOTE: Vercel Blob is eventually consistent and this claim is not atomic, so a
// very tight burst of identical requests could still slip a duplicate through
// before the claim is visible. This is an accepted trade-off of the Blob
// approach; it reliably stops re-processing of the same email across runs and
// bounds most loop scenarios.

import crypto from "crypto";

import { del, list, put } from "@vercel/blob";

const PREFIX = "tapmenu/brewfather/idempotency/";
// A "processing" claim older than this is treated as abandoned (e.g. a crashed
// invocation), so a genuine retry isn't blocked forever.
const STALE_MS = 10 * 60 * 1000;

export type IdempotencyStatus = "processing" | "done";

export type IdempotencyRecord = {
  key: string;
  status: IdempotencyStatus;
  at: string; // ISO timestamp
  result?: unknown;
};

function pathForKey(key: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(key)
    .digest("hex")
    .slice(0, 40);
  return `${PREFIX}${hash}.json`;
}

async function findBlob(path: string) {
  const { blobs } = await list({ prefix: path, limit: 1 });
  return blobs.find((b) => b.pathname === path) ?? null;
}

export async function readRecord(
  key: string,
): Promise<IdempotencyRecord | null> {
  const blob = await findBlob(pathForKey(key));
  if (!blob) return null;
  try {
    const res = await fetch(blob.downloadUrl, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as IdempotencyRecord;
  } catch {
    return null;
  }
}

async function write(key: string, record: IdempotencyRecord): Promise<void> {
  await put(pathForKey(key), JSON.stringify(record), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
}

/** Mark a key as in-progress before applying inventory changes. */
export async function claim(key: string): Promise<void> {
  await write(key, {
    key,
    status: "processing",
    at: new Date().toISOString(),
  });
}

/** Record the final result so replays can return it without re-applying. */
export async function complete(key: string, result: unknown): Promise<void> {
  await write(key, {
    key,
    status: "done",
    at: new Date().toISOString(),
    result,
  });
}

/** Remove a claim so a failed request can be retried later. */
export async function release(key: string): Promise<void> {
  const blob = await findBlob(pathForKey(key));
  if (!blob) return;
  try {
    await del(blob.url);
  } catch {
    // best effort; a stale claim will expire via STALE_MS anyway
  }
}

export function isStale(record: IdempotencyRecord): boolean {
  return Date.now() - new Date(record.at).getTime() > STALE_MS;
}
