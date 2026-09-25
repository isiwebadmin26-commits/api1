import type { VercelRequest, VercelResponse } from "@vercel/node";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory sliding window cache per serverless instance
const ipStore = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of ipStore.entries()) {
    if (now > record.resetTime) {
      ipStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export function checkRateLimit(
  req: VercelRequest,
  res?: VercelResponse
): RateLimitResult {
  cleanup();

  const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || "60");
  const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS || "60");
  const windowMs = windowSeconds * 1000;

  // Extract client identifier (X-Forwarded-For or remote address or API Key)
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === "string"
    ? forwardedFor.split(",")[0].trim()
    : req.socket?.remoteAddress || "127.0.0.1";

  const key = `rl:${ip}`;
  const now = Date.now();

  let record = ipStore.get(key);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    ipStore.set(key, record);
  } else {
    record.count++;
  }

  const remaining = Math.max(0, maxRequests - record.count);
  const resetSeconds = Math.ceil((record.resetTime - now) / 1000);
  const allowed = record.count <= maxRequests;

  if (res) {
    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", remaining.toString());
    res.setHeader("X-RateLimit-Reset", resetSeconds.toString());
  }

  return {
    allowed,
    limit: maxRequests,
    remaining,
    resetSeconds,
  };
}
