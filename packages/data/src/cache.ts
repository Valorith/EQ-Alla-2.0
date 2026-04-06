import Redis, { type RedisOptions } from "ioredis";
import { env } from "./env";

const memory = new Map<string, { expiresAt: number; value: unknown }>();
const inFlight = new Map<string, Promise<unknown>>();

let redis: Redis | null = null;
let redisDisabledUntil = 0;
const redisOperationTimeoutMs = 250;
const redisDisableDurationMs = 30_000;

function createRedisOptions(connectionUrl: string): RedisOptions {
  const parsed = new URL(connectionUrl);
  const dbValue = parsed.pathname.replace(/^\//, "");
  const db = dbValue ? Number(dbValue) : undefined;
  const familyValue = parsed.searchParams.get("family");
  const family = familyValue ? Number(familyValue) : undefined;

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: Number.isFinite(db) ? db : undefined,
    family: family === 4 || family === 6 ? family : undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 500
  };
}

function getRedis() {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return null;
  }

  if (!env.EQ_REDIS_URL) {
    return null;
  }

  if (redisDisabledUntil > Date.now()) {
    return null;
  }

  if (!redis) {
    redis = new Redis(createRedisOptions(env.EQ_REDIS_URL));
    redis.on("error", () => {});
  }

  return redis;
}

function disableRedisTemporarily() {
  redisDisabledUntil = Date.now() + redisDisableDurationMs;

  if (redis) {
    redis.disconnect(false);
    redis = null;
  }
}

async function withRedisTimeout<T>(operation: Promise<T>) {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error("Redis operation timed out")), redisOperationTimeoutMs);
      })
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();

  if (client) {
    try {
      if (client.status === "wait") {
        await withRedisTimeout(client.connect());
      }

      const payload = await withRedisTimeout(client.get(key));
      return payload ? (JSON.parse(payload) as T) : null;
    } catch {
      disableRedisTemporarily();
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
        await withRedisTimeout(client.connect());
      }

      await withRedisTimeout(client.set(key, JSON.stringify(value), "EX", ttlSeconds));
      return;
    } catch {
      disableRedisTemporarily();
      // fall through
    }
  }

  memory.set(key, {
    expiresAt: Date.now() + ttlSeconds * 1_000,
    value
  });
}

export async function cacheGetOrResolve<T>(key: string, ttlSeconds: number, resolve: () => Promise<T>) {
  const cached = await cacheGet<T>(key);

  if (cached !== null) {
    return cached;
  }

  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const pending = (async () => {
    try {
      const value = await resolve();
      await cacheSet(key, value, ttlSeconds);
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, pending);
  return pending;
}
