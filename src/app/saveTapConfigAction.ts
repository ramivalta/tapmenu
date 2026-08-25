"use server";

import { revalidatePath } from "next/cache";

import { redis } from "@/lib/redis";
import { TAP_CONFIG_KEY } from "@/lib/tapmenu/config";

const saveTapConfigAction = async (
  queryParams: string,
  password: string | null,
) => {
  if (!password || password !== process.env.PASSWORD) {
    throw new Error("Invalid password");
  }

  let config: Record<string, string>;
  try {
    config = JSON.parse(queryParams);
  } catch {
    throw new Error("Invalid tap config payload");
  }

  await redis().set(TAP_CONFIG_KEY, {
    config,
    updatedAt: new Date().toISOString(),
  });

  revalidatePath("/");
  revalidatePath("/taproom");

  return "Tap config saved";
};

export default saveTapConfigAction;
