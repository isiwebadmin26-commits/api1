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
import { parseDryRun } from "../security/validator";
import { sendRawOrWrapped, sendError } from "../lib/response";
import { logger } from "../lib/logger";

export async function handleMonthlyTraffic(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  try {
    logger.info("Executing Monthly Traffic controller", { route: "/reports/monthly/traffic", dryRun });
    const result = await getMonthlyTrafficService();
    if (!dryRun) {
      await sendMonthlyTrafficEmail(result);
      logger.info("Monthly Traffic email dispatched successfully");
    }
    logger.info("Monthly Traffic execution success", {
      route: "/reports/monthly/traffic",
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, { ...result, emailDispatched: !dryRun });
  } catch (error: any) {
    logger.error("Monthly Traffic execution error", {
      route: "/reports/monthly/traffic",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to retrieve monthly traffic", "INTERNAL_ERROR");
  }
}

export async function handleMonthlyCareerApplications(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  try {
    logger.info("Executing Monthly Career Applications controller", {
      route: "/reports/monthly/career-applications",
      dryRun,
    });
    const result = await getMonthlyCareerApplicationsService();
    if (!dryRun) {
      await sendMonthlyCareerAppsEmail(result);
      logger.info("Monthly Career Applications email dispatched successfully");
    }
    logger.info("Monthly Career Applications execution success", {
      route: "/reports/monthly/career-applications",
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, { ...result, emailDispatched: !dryRun });
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

export async function handleMonthlyReport(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  try {
    logger.info("Executing Monthly Report runner", { route: "/reports/monthly", dryRun });
    const result = await executeMonthlyReportService({ dryRun });
    logger.info("Monthly Report execution success", {
      route: "/reports/monthly",
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, result);
  } catch (error: any) {
    logger.error("Monthly Report execution error", {
      route: "/reports/monthly",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to execute monthly report", "INTERNAL_ERROR");
  }
}
