import { redis } from "@/server/db/redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

// In-memory fallback used only when Redis is unreachable (e.g. local dev without Redis running).
// Not shared across serverless instances — Redis is the source of truth in production.
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function checkInMemory(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1 };
  }

  entry.count += 1;
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return checkInMemory(key, limit, windowSeconds);
  }
}

/**
 * Whether `key` is already over `limit` in its current window, WITHOUT counting this call. Used for login
 * failures: only failed attempts should count against an account, otherwise anyone could lock a victim out
 * (or a busy account out of itself) with successful logins.
 */
export async function isRateLimited(key: string, limit: number): Promise<boolean> {
  try {
    const count = Number((await redis.get(`ratelimit:${key}`)) ?? 0);
    return count >= limit;
  } catch {
    const entry = memoryStore.get(key);
    return !!entry && entry.resetAt >= Date.now() && entry.count >= limit;
  }
}

/**
 * Per-IP limit. When the caller's address is unknown (no trusted proxy configured) every visitor would share
 * one bucket, so the limit is relaxed tenfold instead of letting a handful of requests block the whole site.
 */
export async function rateLimitByIp(ip: string, name: string, limit: number, windowSeconds: number) {
  const unknown = ip === "unknown";
  return rateLimit(`${name}:${ip}`, unknown ? limit * 10 : limit, windowSeconds);
}
