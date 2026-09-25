import type { VercelRequest, VercelResponse } from "@vercel/node";
import { config } from "dotenv";
import path from "path";
import { runSecurityMiddleware } from "../../security";
import { handleCareerReport } from "../../controller/career-controller";

config({ path: path.join(process.cwd(), ".env.local") });

/**
 * Backward-compatible endpoint for Career Report
 * Compatible with existing Jira automation triggers and new /reports/career URL
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const security = runSecurityMiddleware(req, res, {
    allowedMethods: ["POST", "GET"],
    requireAuth: true,
  });
  if (!security.passed) return;

  return handleCareerReport(req, res);
}
