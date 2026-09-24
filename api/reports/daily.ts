import type { VercelRequest, VercelResponse } from "@vercel/node";
import { config } from "dotenv";
import path from "path";
import { runDailyReport } from "../../lib/analytics-report";

config({ path: path.join(process.cwd(), ".env.local") });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  try {
    const dryRun = req.query.dryRun === "true";
    const result = await runDailyReport({ dryRun });
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Daily report error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to execute daily report",
    });
  }
}
