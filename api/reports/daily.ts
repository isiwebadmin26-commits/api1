import type { VercelRequest, VercelResponse } from "@vercel/node";
import { config } from "dotenv";
import path from "path";
import { runSecurityMiddleware } from "../../security";
import { handleDailyReport } from "../../controller/daily-controller";

config({ path: path.join(process.cwd(), ".env.local") });

/**
 * Backward-compatible endpoint for Daily Report
 * Compatible with existing Jira automation triggers
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const security = runSecurityMiddleware(req, res, {
    allowedMethods: ["POST", "GET"],
    requireAuth: false,
  });
  if (!security.passed) return;

  return handleDailyReport(req, res);
}
