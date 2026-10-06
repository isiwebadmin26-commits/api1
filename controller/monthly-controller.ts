import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getMonthlyTrafficService,
  getMonthlyCareerApplicationsService,
  executeMonthlyReportService,
} from "../lib/monthly-service";
import {
  sendMonthlyTrafficEmail,
  sendMonthlyCareerAppsEmail,
} from "../lib/micro-report-emails";
import { parseDryRun, parseForce, parseSendEmail } from "../security/validator";
import { canDispatchEmail, recordEmailDispatch } from "../lib/email-dedup";
import { sendRawOrWrapped, sendError } from "../lib/response";
import { logger } from "../lib/logger";

/**
 * Monthly Traffic Controller
 * Metrics endpoint: does not send separate email unless explicitly requested.
 */
export async function handleMonthlyTraffic(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  const shouldSendEmail = parseSendEmail(req, true);
  try {
    logger.info("Executing Monthly Traffic controller", { route: "/reports/monthly/traffic", dryRun, shouldSendEmail });
    const result = await getMonthlyTrafficService();
    let emailDispatched = false;
    if (!dryRun && shouldSendEmail) {
      await sendMonthlyTrafficEmail(result);
      emailDispatched = true;
      logger.info("Monthly Traffic email dispatched successfully");
    }
    return sendRawOrWrapped(res, { ...result, emailDispatched });
  } catch (error: any) {
    logger.error("Monthly Traffic execution error", {
      route: "/reports/monthly/traffic",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to retrieve monthly traffic", "INTERNAL_ERROR");
  }
}

/**
 * Monthly Career Applications Controller
 * Triggered on demand via controller (code MCA)
 */
export async function handleMonthlyCareerApplications(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  const shouldSendEmail = parseSendEmail(req, true);
  try {
    logger.info("Executing Monthly Career Applications controller", {
      route: "/reports/monthly/career-applications",
      dryRun,
      shouldSendEmail,
    });
    const result = await getMonthlyCareerApplicationsService();
    let emailDispatched = false;
    if (!dryRun && shouldSendEmail) {
      await sendMonthlyCareerAppsEmail(result);
      emailDispatched = true;
      logger.info("Monthly Career Applications email dispatched successfully");
    }
    return sendRawOrWrapped(res, { ...result, emailDispatched });
  } catch (error: any) {
    logger.error("Monthly Career Applications execution error", {
      route: "/reports/monthly/career-applications",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(
      res,
      500,
      error.message || "Failed to retrieve monthly career applications",
      "INTERNAL_ERROR"
    );
  }
}

/**
 * Primary Monthly Report Runner (/reports/monthly or MEX)
 * Dispatched MONTHLY ONCE.
 * Guarded by deduplication: prevents accidental daily triggers from spamming monthly reports.
 */
export async function handleMonthlyReport(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  const force = parseForce(req);
  try {
    logger.info("Executing Monthly Report runner", { route: "/reports/monthly", dryRun, force });

    let emailDispatched = false;
    let duplicateSkipped = false;
    let dedupMessage = "Monthly Executive Report execution started";

    if (!dryRun) {
      const check = canDispatchEmail("monthly", { force });
      if (!check.allowed) {
        duplicateSkipped = true;
        dedupMessage = check.message || "Monthly report already dispatched this month. Duplicate prevented.";
        logger.warn(dedupMessage);
      }
    }

    const actualDryRun = dryRun || duplicateSkipped;
    const result = await executeMonthlyReportService({ dryRun: actualDryRun });

    if (!actualDryRun) {
      recordEmailDispatch("monthly", { period: result.month });
      emailDispatched = true;
      dedupMessage = "Monthly Executive Email dispatched successfully";
      logger.info(dedupMessage);
    }

    logger.info("Monthly Report execution success", {
      route: "/reports/monthly",
      emailDispatched,
      duplicateSkipped,
      durationMs: Date.now() - start,
    });

    return sendRawOrWrapped(res, {
      ...result,
      emailDispatched,
      duplicateSkipped,
      policy: "Monthly report triggered monthly once",
      message: dedupMessage,
    });
  } catch (error: any) {
    logger.error("Monthly Report execution error", {
      route: "/reports/monthly",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to execute monthly report", "INTERNAL_ERROR");
  }
}
