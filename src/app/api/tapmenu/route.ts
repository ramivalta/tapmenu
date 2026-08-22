// GET /api/tapmenu
//
// The current tap menu as JSON, resolved and shaped for display clients (the
// tvOS app) so they never need Brewfather credentials or the query-param
// encoding the web pages use.
//
// The web pages build this same view inline as server components: fetch
// completed batches from Brewfather, read the saved tap assignment from blob
// storage, then join the two. This route does that join once and returns the
// whole recipe payload — hops grouped by use, malt bill, yeast, dates, Untappd
// links — rather than the subset the cards happen to render.
//
// Auth: none. Everything here is already public on the `/` menu, and the
// Brewfather token stays server-side. The write paths (saving a tap config,
// hop-inventory sync) keep living behind the PASSWORD secret.

import { NextResponse } from "next/server";

import { Beer, cleanText, shapeBeer } from "@/lib/tapmenu/beer";
import { readSavedTapConfig } from "@/lib/tapmenu/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCHES_URL =
  "https://api.brewfather.app/v2/batches?complete=True&status=Completed&limit=25";

const TAP_COUNT = 4;

type Tap = {
  tapNumber: number;
  /** Null when the tap is empty, so clients render a placeholder. */
  beer: Beer | null;
  /** Hand-written pour note for this tap, independent of the beer. */
  notes: string | null;
};

export async function GET() {
  const token = process.env.BREWFATHER_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "BREWFATHER_API_TOKEN is not configured" },
      { status: 500 },
    );
  }

  try {
    const [batchesRes, saved] = await Promise.all([
      fetch(BATCHES_URL, {
        headers: { authorization: `Basic ${token}` },
        cache: "no-store",
      }),
      readSavedTapConfig(),
    ]);

    if (!batchesRes.ok) {
      return NextResponse.json(
        { error: `Brewfather returned HTTP ${batchesRes.status}` },
        { status: 502 },
      );
    }

    const batches = await batchesRes.json();
    if (!Array.isArray(batches)) {
      return NextResponse.json(
        { error: "Unexpected batch payload from Brewfather" },
        { status: 502 },
      );
    }

    const taps: Tap[] = [];
    for (let i = 1; i <= TAP_COUNT; i++) {
      const batchId = saved.config[`tap${i}`];
      const batch = batchId
        ? batches.find((candidate: any) => candidate?._id === batchId)
        : undefined;
      taps.push({
        tapNumber: i,
        beer: shapeBeer(batch),
        notes: cleanText(saved.config[`tap${i}Notes`]),
      });
    }

    return NextResponse.json({ updatedAt: saved.updatedAt, taps });
  } catch (error: any) {
    console.error("GET /api/tapmenu failed", error);
    return NextResponse.json(
      { error: "Failed to build tap menu" },
      { status: 500 },
    );
  }
}
