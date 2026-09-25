import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getDailyLeadsService,
  getDailyTrafficService,
  getDailyStatsService,
  getDailyPendingFollowupService,
  executeDailyReportService,
} from "../lib/daily-service";
import { parseDryRun } from "../security/validator";
import { sendRawOrWrapped, sendError } from "../lib/response";
import { logger } from "../lib/logger";

export async function handleDailyLeads(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  try {
    logger.info("Executing Daily Leads controller", { route: "/reports/daily/leads" });
    const result = await getDailyLeadsService();
    logger.info("Daily Leads execution success", {
      route: "/reports/daily/leads",
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, result);
  } catch (error: any) {
    logger.error("Daily Leads execution error", {
      route: "/reports/daily/leads",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to retrieve daily leads", "INTERNAL_ERROR");
  }
}

export async function handleDailyTraffic(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  try {
    logger.info("Executing Daily Traffic controller", { route: "/reports/daily/traffic" });
    const result = await getDailyTrafficService();
    logger.info("Daily Traffic execution success", {
      route: "/reports/daily/traffic",
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, result);
  } catch (error: any) {
    logger.error("Daily Traffic execution error", {
      route: "/reports/daily/traffic",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to retrieve daily traffic", "INTERNAL_ERROR");
  }
}

export async function handleDailyStats(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  try {
    logger.info("Executing Daily Stats controller", { route: "/reports/daily/stats" });
    const result = await getDailyStatsService();
    logger.info("Daily Stats execution success", {
      route: "/reports/daily/stats",
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, result);
  } catch (error: any) {
    logger.error("Daily Stats execution error", {
      route: "/reports/daily/stats",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to retrieve daily stats", "INTERNAL_ERROR");
  }
}

export async function handleDailyPendingFollowup(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  try {
    logger.info("Executing Daily Pending Followup controller", { route: "/reports/daily/pending-followup" });
    const result = await getDailyPendingFollowupService();
    logger.info("Daily Pending Followup execution success", {
      route: "/reports/daily/pending-followup",
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, result);
  } catch (error: any) {
    logger.error("Daily Pending Followup execution error", {
      route: "/reports/daily/pending-followup",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to retrieve pending followups", "INTERNAL_ERROR");
  }
}

export async function handleDailyReport(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  try {
    logger.info("Executing Daily Report runner", { route: "/reports/daily", dryRun });
    const result = await executeDailyReportService({ dryRun });
    logger.info("Daily Report execution success", {
      route: "/reports/daily",
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, result);
  } catch (error: any) {
    logger.error("Daily Report execution error", {
      route: "/reports/daily",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to execute daily report", "INTERNAL_ERROR");
  }
}
