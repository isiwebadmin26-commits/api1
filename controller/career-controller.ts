import type { VercelRequest, VercelResponse } from "@vercel/node";
import { executeCareerReportService } from "../lib/career-service";
import { parseDryRun } from "../security/validator";
import { sendRawOrWrapped, sendError } from "../lib/response";
import { logger } from "../lib/logger";

export async function handleCareerReport(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  try {
    logger.info("Executing Career Report controller", { route: "/reports/career", dryRun });
    const result = await executeCareerReportService({ dryRun });
    logger.info("Career Report execution success", {
      route: "/reports/career",
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, result);
  } catch (error: any) {
    logger.error("Career Report execution error", {
      route: "/reports/career",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to execute career report", "INTERNAL_ERROR");
  }
}
