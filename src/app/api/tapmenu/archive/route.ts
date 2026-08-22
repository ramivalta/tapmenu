// GET /api/tapmenu/archive?limit=50
//
// The back catalogue: every archived batch, newest brew first, in the same
// `Beer` shape the current-taps route returns. A display client can therefore
// reuse one model for both the menu and the "what else have we brewed" screen.
//
// Archived (rather than Completed) is what `/history` already lists — a batch
// gets archived once the keg blows, so this is genuinely the back catalogue
// and not a second view of what is pouring now.
//
// Auth: none, same reasoning as the menu route — `/history` is already public.

import { NextRequest, NextResponse } from "next/server";

import { orderBy } from "lodash";

import { Beer, shapeBeer } from "@/lib/tapmenu/beer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
// Brewfather caps a single batches request at 50 regardless of what we ask
// for, so promising more here would be a lie. Going beyond 50 means cursor
// pagination via `start_after`, the way `lib/brewfather/client` walks the hop
// inventory — worth doing only once the catalogue outgrows one page.
const MAX_LIMIT = 50;

function batchesUrl(limit: number) {
  return `https://api.brewfather.app/v2/batches?complete=True&status=Archived&limit=${limit}`;
}

/** Clamp the caller's limit so a stray query string cannot ask for everything. */
function parseLimit(raw: string | null): number {
  const parsed = Number(raw);
  if (!raw || !Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  const token = process.env.BREWFATHER_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "BREWFATHER_API_TOKEN is not configured" },
      { status: 500 },
    );
  }

  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

  try {
    const res = await fetch(batchesUrl(limit), {
      headers: { authorization: `Basic ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Brewfather returned HTTP ${res.status}` },
        { status: 502 },
      );
    }

    const batches = await res.json();
    if (!Array.isArray(batches)) {
      return NextResponse.json(
        { error: "Unexpected batch payload from Brewfather" },
        { status: 502 },
      );
    }

    // Brewfather does not guarantee an order, and `/history` sorts client-side
    // by brew date. Sort here so every client gets the same sequence.
    const beers = orderBy(batches, "brewDate", "desc")
      .map(shapeBeer)
      .filter((beer): beer is Beer => beer !== null);

    return NextResponse.json({ count: beers.length, limit, beers });
  } catch (error: any) {
    console.error("GET /api/tapmenu/archive failed", error);
    return NextResponse.json(
      { error: "Failed to load archived batches" },
      { status: 500 },
    );
  }
}
