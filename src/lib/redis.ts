// Shared Upstash Redis client (REST-based, so it works from serverless
// functions without connection pooling).
//
// The Vercel Marketplace "Upstash for Redis" integration injects KV_REST_API_*
// env vars; a database created directly in the Upstash console uses
// UPSTASH_REDIS_REST_*. Accept either so local and deployed setups both work.

import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function redis(): Redis {
  if (!client) {
    const url =
      process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
    const token =
      process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        "Redis is not configured: set KV_REST_API_URL and KV_REST_API_TOKEN " +
          "(or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)",
      );
    }

    client = new Redis({ url, token });
  }
  return client;
}
