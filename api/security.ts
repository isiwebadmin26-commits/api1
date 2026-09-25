import type { VercelRequest, VercelResponse } from "@vercel/node";
import { config } from "dotenv";
import path from "path";
import { runSecurityMiddleware, validateAuth, checkRateLimit } from "../security";
import { sendSuccess } from "../lib/response";

config({ path: path.join(process.cwd(), ".env.local") });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const security = runSecurityMiddleware(req, res, {
    allowedMethods: ["GET", "POST"],
    requireAuth: false, // Security inspect allows diagnostic status
  });
  if (!security.passed) return;

  const auth = validateAuth(req);
  const rateLimit = checkRateLimit(req, res);

  const forwardedFor = req.headers["x-forwarded-for"];
  const clientIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === "string"
    ? forwardedFor.split(",")[0].trim()
    : req.socket?.remoteAddress || "127.0.0.1";

  return sendSuccess(res, {
    service: "daily-report-api-security",
    status: "SECURE",
    clientIp,
    authStatus: {
      authenticated: auth.isAuthenticated,
      authType: auth.authType || "none",
    },
    rateLimitStatus: {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      resetSeconds: rateLimit.resetSeconds,
    },
    policies: {
      allowedMethods: ["GET", "POST"],
      corsEnabled: true,
      encryption: "TLS/HTTPS",
      credentialsProtected: true,
    },
    timestamp: new Date().toISOString(),
  });
}
