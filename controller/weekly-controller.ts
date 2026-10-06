import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getWeeklyTrafficService,
  getWeeklyCareerApplicationsService,
  executeWeeklyReportService,
} from "../lib/weekly-service";
import {
  sendWeeklyTrafficEmail,
  sendWeeklyCareerAppsEmail,
} from "../lib/micro-report-emails";
import { parseDryRun, parseForce, parseSendEmail } from "../security/validator";
import { canDispatchEmail, recordEmailDispatch } from "../lib/email-dedup";
import { sendRawOrWrapped, sendError } from "../lib/response";
import { logger } from "../lib/logger";

/**
 * Weekly Traffic Controller
 * Metrics endpoint: does not send separate email unless explicitly requested.
 */
export async function handleWeeklyTraffic(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  const shouldSendEmail = parseSendEmail(req, true);
  try {
    logger.info("Executing Weekly Traffic controller", { route: "/reports/weekly/traffic", dryRun, shouldSendEmail });
    const result = await getWeeklyTrafficService();
    let emailDispatched = false;
    if (!dryRun && shouldSendEmail) {
      await sendWeeklyTrafficEmail(result);
      emailDispatched = true;
      logger.info("Weekly Traffic email dispatched successfully");
    }
    return sendRawOrWrapped(res, { ...result, emailDispatched });
  } catch (error: any) {
    logger.error("Weekly Traffic execution error", {
      route: "/reports/weekly/traffic",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to retrieve weekly traffic", "INTERNAL_ERROR");
  }
}

/**
 * Weekly Career Applications Controller
 * Triggered on demand via controller (code WCA)
 */
export async function handleWeeklyCareerApplications(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  const shouldSendEmail = parseSendEmail(req, true);
  try {
    logger.info("Executing Weekly Career Applications controller", {
      route: "/reports/weekly/career-applications",
      dryRun,
      shouldSendEmail,
    });
    const result = await getWeeklyCareerApplicationsService();
    let emailDispatched = false;
    if (!dryRun && shouldSendEmail) {
      await sendWeeklyCareerAppsEmail(result);
      emailDispatched = true;
      logger.info("Weekly Career Applications email dispatched successfully");
    }
    return sendRawOrWrapped(res, { ...result, emailDispatched });
  } catch (error: any) {
    logger.error("Weekly Career Applications execution error", {
      route: "/reports/weekly/career-applications",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(
      res,
      500,
      error.message || "Failed to retrieve weekly career applications",
      "INTERNAL_ERROR"
    );
  }
}

/**
 * Primary Weekly Report Runner (/reports/weekly or WEX)
 * Dispatched WEEKLY ONCE.
 * Guarded by deduplication: prevents accidental daily triggers from spamming weekly reports.
 */
export async function handleWeeklyReport(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  const force = parseForce(req);
  try {
    logger.info("Executing Weekly Report runner", { route: "/reports/weekly", dryRun, force });

    let emailDispatched = false;
    let duplicateSkipped = false;
    let dedupMessage = "Weekly Executive Report execution started";

    if (!dryRun) {
      const check = canDispatchEmail("weekly", { force });
      if (!check.allowed) {
        duplicateSkipped = true;
        dedupMessage = check.message || "Weekly report already dispatched this week. Duplicate prevented.";
        logger.warn(dedupMessage);
      }
    }

    // If duplicate was detected and force is not set, run in dryRun mode so data is returned without email re-send
    const actualDryRun = dryRun || duplicateSkipped;
    const result = await executeWeeklyReportService({ dryRun: actualDryRun });

    if (!actualDryRun) {
      recordEmailDispatch("weekly", { period: result.period });
      emailDispatched = true;
      dedupMessage = "Weekly Executive Email dispatched successfully";
      logger.info(dedupMessage);
    }

    logger.info("Weekly Report execution success", {
      route: "/reports/weekly",
      emailDispatched,
      duplicateSkipped,
      durationMs: Date.now() - start,
    });

    return sendRawOrWrapped(res, {
      ...result,
      emailDispatched,
      duplicateSkipped,
      policy: "Weekly report triggered weekly once",
      message: dedupMessage,
    });
  } catch (error: any) {
    logger.error("Weekly Report execution error", {
      route: "/reports/weekly",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to execute weekly report", "INTERNAL_ERROR");
  }
}
