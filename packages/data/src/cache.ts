import Redis from "ioredis";
import { env } from "./env";

const memory = new Map<string, { expiresAt: number; value: unknown }>();

let redis: Redis | null = null;

function getRedis() {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return null;
  }

  if (!env.EQ_REDIS_URL) {
    return null;
  }

  if (!redis) {
    redis = new Redis(env.EQ_REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 500
    });
    redis.on("error", () => {});
  }

  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();

  if (client) {
    try {
      if (client.status === "wait") {
        await client.connect();
      }

      const payload = await client.get(key);
      return payload ? (JSON.parse(payload) as T) : null;
    } catch {
      return null;
    }
  }

  const entry = memory.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }

  return entry.value as T;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number) {
  const client = getRedis();

  if (client) {
    try {
      if (client.status === "wait") {
        await client.connect();
      }

      await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    } catch {
      // fall through
    }
  }

  memory.set(key, {
    expiresAt: Date.now() + ttlSeconds * 1_000,
    value
  });
}
