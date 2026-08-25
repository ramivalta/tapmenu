// POST /api/tapmenu/assign  { tap, batchId, code }
//
// Puts a completed batch on a tap, or clears one with a null batchId. This is
// what the display's "choose a beer" flow calls, so the menu can be changed
// from the taproom rather than from a laptop.
//
// A four-digit code is 10,000 combinations, which is nothing to a script — so
// the code alone is not the protection. Attempts are counted per client in
// Redis and cut off well before a meaningful fraction of that space can be
// tried. What is actually at stake is which beer a display shows, so the aim
// is to make casual tampering pointless rather than to resist a determined
// attacker.

import crypto from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { fetchCompletedBatches } from "@/lib/tapmenu/batches";
import { redis } from "@/lib/redis";
import { readSavedTapConfig, TAP_CONFIG_KEY } from "@/lib/tapmenu/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAP_COUNT = 4;

/** Failed attempts allowed per client before the code stops being accepted. */
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

/** Compare without leaking the answer through how long the check takes. */
function codeMatches(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return `tapmenu:assign-attempts:${ip}`;
}

export async function POST(request: NextRequest) {
  const expected = process.env.TAP_PIN;
  if (!expected) {
    // Fail closed: without a configured code there is nothing to check.
    return json(503, { error: "Tap assignment is not configured" });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Expected a JSON body" });
  }

  const tap = Number(body?.tap);
  if (!Number.isInteger(tap) || tap < 1 || tap > TAP_COUNT) {
    return json(400, { error: `Expected tap between 1 and ${TAP_COUNT}` });
  }

  const code = typeof body?.code === "string" ? body.code : "";
  if (!/^\d{4}$/.test(code)) {
    return json(400, { error: "Expected a four-digit code" });
  }

  // A null batchId clears the tap, which is what happens when a keg blows.
  const batchId =
    body?.batchId === null || body?.batchId === undefined
      ? null
      : String(body.batchId);

  try {
    const key = clientKey(request);
    const attempts = await redis().incr(key);
    if (attempts === 1) {
      await redis().expire(key, ATTEMPT_WINDOW_SECONDS);
    }
    if (attempts > MAX_ATTEMPTS) {
      return json(429, { error: "Too many attempts. Try again later." });
    }

    if (!codeMatches(code, expected)) {
      return json(403, { error: "Incorrect code" });
    }

    // Correct code: forget the failures so normal use is never locked out.
    await redis().del(key);

    // Only something Brewfather calls complete may go on a tap — this stops an
    // arbitrary string being written into the config.
    if (batchId !== null) {
      const batches = await fetchCompletedBatches();
      if (!batches.some((batch: any) => batch?._id === batchId)) {
        return json(400, { error: "No completed batch with that id" });
      }
    }

    const saved = await readSavedTapConfig();
    const config = { ...saved.config };
    if (batchId === null) {
      delete config[`tap${tap}`];
    } else {
      config[`tap${tap}`] = batchId;
    }

    const updatedAt = new Date().toISOString();
    await redis().set(TAP_CONFIG_KEY, { config, updatedAt });

    return json(200, { tap, batchId, updatedAt });
  } catch (error: any) {
    console.error("POST /api/tapmenu/assign failed", error);
    return json(502, { error: "Failed to save the tap assignment" });
  }
}
