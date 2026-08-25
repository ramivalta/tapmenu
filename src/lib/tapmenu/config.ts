// Reading the saved tap assignment.
//
// `/taproom` persists its query string as JSON, so the saved config arrives as
// `{ tap1: "<batchId>", tap1Notes: "...", ... }`. The whole thing lives in a
// single Redis key together with its save timestamp.

import { redis } from "@/lib/redis";

export const TAP_CONFIG_KEY = "tapmenu:defaultTapConfig";

export type SavedTapConfig = {
  config: Record<string, string>;
  /** When the config was last saved, or null if nothing has been saved yet. */
  updatedAt: string | null;
};

export async function readSavedTapConfig(): Promise<SavedTapConfig> {
  const saved = await redis().get<SavedTapConfig>(TAP_CONFIG_KEY);

  if (!saved || typeof saved !== "object") {
    return { config: {}, updatedAt: null };
  }

  return {
    config:
      saved.config && typeof saved.config === "object" ? saved.config : {},
    updatedAt: saved.updatedAt ?? null,
  };
}
