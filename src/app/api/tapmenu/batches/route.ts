// GET /api/tapmenu/batches
//
// Completed batches that can be put on a tap, for the display's picker. Each
// carries the tap it is already pouring on, so the picker can show that rather
// than letting the same beer be assigned twice.
//
// Deliberately a thinner payload than /api/tapmenu: this is a chooser list, so
// it carries what is needed to tell two beers apart and nothing more.

import { NextResponse } from "next/server";

import { round } from "lodash";

import { fetchCompletedBatches } from "@/lib/tapmenu/batches";
import { readSavedTapConfig } from "@/lib/tapmenu/config";
import { cleanText } from "@/lib/tapmenu/beer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAP_COUNT = 4;

export async function GET() {
  try {
    const [batches, saved] = await Promise.all([
      fetchCompletedBatches(),
      readSavedTapConfig(),
    ]);

    // Which batch is on which tap, so the picker can mark them.
    const tapOf = new Map<string, number>();
    for (let i = 1; i <= TAP_COUNT; i++) {
      const id = saved.config[`tap${i}`];
      if (id) {
        tapOf.set(id, i);
      }
    }

    const available = batches
      .map((batch: any) => ({
        id: cleanText(batch?._id),
        name: cleanText(batch?.recipe?.name),
        style: cleanText(batch?.recipe?.style?.name),
        abv:
          typeof batch?.measuredAbv === "number"
            ? round(batch.measuredAbv, 1)
            : null,
        ibu:
          typeof batch?.estimatedIbu === "number"
            ? round(batch.estimatedIbu)
            : null,
        onTap: batch?._id ? (tapOf.get(batch._id) ?? null) : null,
      }))
      .filter((batch) => batch.id !== null && batch.name !== null);

    return NextResponse.json({ count: available.length, batches: available });
  } catch (error: any) {
    console.error("GET /api/tapmenu/batches failed", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to list batches" },
      { status: 502 },
    );
  }
}
