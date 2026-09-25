import type { VercelRequest, VercelResponse } from "@vercel/node";
import { config } from "dotenv";
import path from "path";
import { runSecurityMiddleware } from "../../../security";
import { handleDailyLeads } from "../../../controller/daily-controller";

config({ path: path.join(process.cwd(), ".env.local") });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const security = runSecurityMiddleware(req, res, {
    allowedMethods: ["GET", "POST"],
    requireAuth: true,
  });
  if (!security.passed) return;

  return handleDailyLeads(req, res);
}
