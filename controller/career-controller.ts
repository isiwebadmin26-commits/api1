import type { VercelRequest, VercelResponse } from "@vercel/node";
import { executeCareerReportService } from "../lib/career-service";
import { parseDryRun, parseForce } from "../security/validator";
import { canDispatchEmail, recordEmailDispatch } from "../lib/email-dedup";
import { sendRawOrWrapped, sendError } from "../lib/response";
import { logger } from "../lib/logger";

export async function handleCareerReport(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  const force = parseForce(req);
  try {
    logger.info("Executing Career Report controller", { route: "/reports/career", dryRun, force });

    let emailDispatched = false;
    let duplicateSkipped = false;
    let dedupMessage = "Monthly Career Digest execution started";

    if (!dryRun) {
      const check = canDispatchEmail("monthly-career", { force });
      if (!check.allowed) {
        duplicateSkipped = true;
        dedupMessage = check.message || "Career digest already dispatched this month. Duplicate prevented.";
        logger.warn(dedupMessage);
      }
    }

    const actualDryRun = dryRun || duplicateSkipped;
    const result = await executeCareerReportService({ dryRun: actualDryRun });

    if (!actualDryRun) {
      recordEmailDispatch("monthly-career");
      emailDispatched = true;
      dedupMessage = "Career Digest Email dispatched successfully";
      logger.info(dedupMessage);
    }

    logger.info("Career Report execution success", {
      route: "/reports/career",
      emailDispatched,
      duplicateSkipped,
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, {
      ...result,
      emailDispatched,
      duplicateSkipped,
      policy: "Monthly career digest triggered monthly once",
      message: dedupMessage,
    });
  } catch (error: any) {
    logger.error("Career Report execution error", {
      route: "/reports/career",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to execute career report", "INTERNAL_ERROR");
  }
}
