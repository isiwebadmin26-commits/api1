import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runMonthlyReport } from "../../lib/analytics-report";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Only POST is supported."
    });
  }

  const dryRun = req.query.dryRun === "true" || (Array.isArray(req.query.dryRun) && req.query.dryRun[0] === "true");

  try {
    const result = await runMonthlyReport({ dryRun });
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Monthly report execution error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Report failed"
    });
  }
}
