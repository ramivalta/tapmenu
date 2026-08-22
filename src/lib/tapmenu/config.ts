// Reading the saved tap assignment.
//
// `/taproom` persists its query string as JSON in Vercel Blob, so the saved
// config arrives as `{ tap1: "<batchId>", tap1Notes: "...", ... }`. Blobs are
// written under a fixed pathname but Vercel may suffix it, so the newest
// matching blob wins.

import { list } from "@vercel/blob";
import { first, orderBy } from "lodash";

const BLOB_PREFIX = "tapmenu/defaultTapConfig";

export type SavedTapConfig = {
  config: Record<string, string>;
  /** When the config was last saved, or null if nothing has been saved yet. */
  updatedAt: string | null;
};

export async function readSavedTapConfig(): Promise<SavedTapConfig> {
  const blobs = await list({ prefix: BLOB_PREFIX });
  const candidates = (blobs?.blobs ?? []).filter((blob) =>
    blob.pathname.startsWith(BLOB_PREFIX),
  );
  const latest = first(orderBy(candidates, "uploadedAt", "desc"));
  const updatedAt = latest?.uploadedAt
    ? new Date(latest.uploadedAt).toISOString()
    : null;

  if (!latest?.downloadUrl) {
    return { config: {}, updatedAt };
  }

  const res = await fetch(latest.downloadUrl, { cache: "no-store" });
  if (!res.ok) {
    console.error(`Failed to read saved tap config (HTTP ${res.status})`);
    return { config: {}, updatedAt };
  }

  const config = await res.json();
  return {
    config: config && typeof config === "object" ? config : {},
    updatedAt,
  };
}
