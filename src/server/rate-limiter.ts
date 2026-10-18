import { Context, Next } from "hono";
import type { AppDeps } from "../deps.ts";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function rateLimit(deps: Pick<AppDeps, "store" | "clock">, config: RateLimitConfig) {
  const { store, clock } = deps;
  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const key = ["rate_limit", c.req.path, ip];

    const now = clock();

    const entry = await store.get<{ count: number; resetAt: number }>(key);

    if (entry && entry.resetAt > now) {
      if (entry.count >= config.maxRequests) {
        return c.json(
          {
            error: "rate_limit_exceeded",
            error_description: "Too many requests. Please try again later.",
          },
          429
        );
      }
      await store.set(key, { count: entry.count + 1, resetAt: entry.resetAt }, { ttlMs: config.windowMs });
    } else {
      await store.set(key, { count: 1, resetAt: now + config.windowMs }, { ttlMs: config.windowMs });
    }

    await next();
  };
}
