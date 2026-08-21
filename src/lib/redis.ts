import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Redis is optional in dev. When unset, callers should fall back to no-op.
 */
export const redis: Redis | null =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export const hasRedis = redis !== null;

/** Rate limit for metadata fetch + checkout creation. */
export const submitLimiter =
  redisUrl && redisToken
    ? new Ratelimit({
        redis: new Redis({ url: redisUrl, token: redisToken }),
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        prefix: "distributor:submit",
        analytics: false,
      })
    : null;

/** Strict rate limit on the redirect endpoint per visitor hash. */
export const redirectLimiter =
  redisUrl && redisToken
    ? new Ratelimit({
        redis: new Redis({ url: redisUrl, token: redisToken }),
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        prefix: "distributor:redirect",
        analytics: false,
      })
    : null;

/** Brute-force protection for the single-operator admin login. */
export const adminLoginLimiter =
  redisUrl && redisToken
    ? new Ratelimit({
        redis: new Redis({ url: redisUrl, token: redisToken }),
        limiter: Ratelimit.slidingWindow(5, "10 m"),
        prefix: "distributor:admin-login",
        analytics: false,
      })
    : null;
