import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getWeeklyTrafficService,
  getWeeklyCareerApplicationsService,
  executeWeeklyReportService,
} from "../lib/weekly-service";
import { parseDryRun } from "../security/validator";
import { sendRawOrWrapped, sendError } from "../lib/response";
import { logger } from "../lib/logger";

export async function handleWeeklyTraffic(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  try {
    logger.info("Executing Weekly Traffic controller", { route: "/reports/weekly/traffic" });
    const result = await getWeeklyTrafficService();
    logger.info("Weekly Traffic execution success", {
      route: "/reports/weekly/traffic",
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, result);
  } catch (error: any) {
    logger.error("Weekly Traffic execution error", {
      route: "/reports/weekly/traffic",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to retrieve weekly traffic", "INTERNAL_ERROR");
  }
}

export async function handleWeeklyCareerApplications(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  try {
    logger.info("Executing Weekly Career Applications controller", {
      route: "/reports/weekly/career-applications",
    });
    const result = await getWeeklyCareerApplicationsService();
    logger.info("Weekly Career Applications execution success", {
      route: "/reports/weekly/career-applications",
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, result);
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

export async function handleWeeklyReport(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  try {
    logger.info("Executing Weekly Report runner", { route: "/reports/weekly", dryRun });
    const result = await executeWeeklyReportService({ dryRun });
    logger.info("Weekly Report execution success", {
      route: "/reports/weekly",
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, result);
  } catch (error: any) {
    logger.error("Weekly Report execution error", {
      route: "/reports/weekly",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to execute weekly report", "INTERNAL_ERROR");
  }
}
