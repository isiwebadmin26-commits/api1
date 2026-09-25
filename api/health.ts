import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runSecurityMiddleware } from "../security";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const security = runSecurityMiddleware(req, res, {
    allowedMethods: ["GET", "HEAD"],
    requireAuth: false,
  });
  if (!security.passed) return;

  return res.status(200).json({
    status: "ok",
    service: "daily-report-api",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
