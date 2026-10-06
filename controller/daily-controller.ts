import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getDailyLeadsService,
  getDailyTrafficService,
  getDailyStatsService,
  getDailyPendingFollowupService,
} from "../lib/daily-service";
import {
  sendDailyLeadsEmail,
  sendDailyTrafficEmail,
  sendDailyStatsEmail,
  sendDailyPendingFollowupEmail,
} from "../lib/micro-report-emails";
import { parseDryRun, parseForce, parseSendEmail } from "../security/validator";
import { canDispatchEmail, recordEmailDispatch } from "../lib/email-dedup";
import { sendRawOrWrapped, sendError } from "../lib/response";
import { logger } from "../lib/logger";

/**
 * 1. Daily Leads Summary Controller
 * Only 1 Leads email per day. Duplicate triggers on the same calendar day are prevented.
 */
export async function handleDailyLeads(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  const force = parseForce(req);
  try {
    logger.info("Executing Daily Leads controller", { route: "/reports/daily/leads", dryRun, force });
    const result = await getDailyLeadsService();
    let emailDispatched = false;
    let duplicateSkipped = false;
    let message = "Daily Leads Report retrieved";

    if (!dryRun) {
      const check = canDispatchEmail("daily-leads", { force });
      if (check.allowed) {
        await sendDailyLeadsEmail(result);
        recordEmailDispatch("daily-leads", { date: result.date });
        emailDispatched = true;
        message = "Daily Leads email dispatched successfully";
        logger.info(message);
      } else {
        duplicateSkipped = true;
        message = check.message || "Daily Leads email already dispatched today. Duplicate prevented.";
        logger.warn(message);
      }
    }

    logger.info("Daily Leads execution success", {
      route: "/reports/daily/leads",
      emailDispatched,
      duplicateSkipped,
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, {
      ...result,
      emailDispatched,
      duplicateSkipped,
      message,
    });
  } catch (error: any) {
    logger.error("Daily Leads execution error", {
      route: "/reports/daily/leads",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to retrieve daily leads", "INTERNAL_ERROR");
  }
}

/**
 * 2. Daily Traffic Analysis Controller
 * Only 1 Traffic email per day. Duplicate triggers on the same calendar day are prevented.
 */
export async function handleDailyTraffic(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  const force = parseForce(req);
  try {
    logger.info("Executing Daily Traffic controller", { route: "/reports/daily/traffic", dryRun, force });
    const result = await getDailyTrafficService();
    let emailDispatched = false;
    let duplicateSkipped = false;
    let message = "Daily Traffic Report retrieved";

    if (!dryRun) {
      const check = canDispatchEmail("daily-traffic", { force });
      if (check.allowed) {
        await sendDailyTrafficEmail(result);
        recordEmailDispatch("daily-traffic", { date: result.date });
        emailDispatched = true;
        message = "Daily Traffic email dispatched successfully";
        logger.info(message);
      } else {
        duplicateSkipped = true;
        message = check.message || "Daily Traffic email already dispatched today. Duplicate prevented.";
        logger.warn(message);
      }
    }

    logger.info("Daily Traffic execution success", {
      route: "/reports/daily/traffic",
      emailDispatched,
      duplicateSkipped,
      durationMs: Date.now() - start,
    });
    return sendRawOrWrapped(res, {
      ...result,
      emailDispatched,
      duplicateSkipped,
      message,
    });
  } catch (error: any) {
    logger.error("Daily Traffic execution error", {
      route: "/reports/daily/traffic",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to retrieve daily traffic", "INTERNAL_ERROR");
  }
}

/**
 * Daily Stats & KPIs Controller
 * Metrics endpoint: does NOT send separate emails daily unless explicitly requested.
 */
export async function handleDailyStats(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  const shouldSendEmail = parseSendEmail(req, true);
  try {
    logger.info("Executing Daily Stats controller", { route: "/reports/daily/stats", dryRun, shouldSendEmail });
    const result = await getDailyStatsService();
    let emailDispatched = false;
    if (!dryRun && shouldSendEmail) {
      await sendDailyStatsEmail(result);
      emailDispatched = true;
      logger.info("Daily Stats email dispatched successfully");
    }
    return sendRawOrWrapped(res, { ...result, emailDispatched });
  } catch (error: any) {
    logger.error("Daily Stats execution error", {
      route: "/reports/daily/stats",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to retrieve daily stats", "INTERNAL_ERROR");
  }
}

/**
 * Daily Pending Followup Controller
 * Triggered on demand via controller (code DPF)
 */
export async function handleDailyPendingFollowup(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  const shouldSendEmail = parseSendEmail(req, true);
  try {
    logger.info("Executing Daily Pending Followup controller", {
      route: "/reports/daily/pending-followup",
      dryRun,
      shouldSendEmail,
    });
    const result = await getDailyPendingFollowupService();
    let emailDispatched = false;
    if (!dryRun && shouldSendEmail) {
      await sendDailyPendingFollowupEmail(result);
      emailDispatched = true;
      logger.info("Daily Pending Followup email dispatched successfully");
    }
    return sendRawOrWrapped(res, { ...result, emailDispatched });
  } catch (error: any) {
    logger.error("Daily Pending Followup execution error", {
      route: "/reports/daily/pending-followup",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to retrieve pending followups", "INTERNAL_ERROR");
  }
}

/**
 * Daily Combined Runner (/reports/daily or DEX)
 * Orchestrates the EXACT 2 daily emails:
 * 1. Daily Traffic Analysis
 * 2. Daily Leads Summary
 * Prevents redundant third executive emails and skips duplicates if already sent today.
 */
export async function handleDailyReport(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const dryRun = parseDryRun(req);
  const force = parseForce(req);
  try {
    logger.info("Executing Daily 2-Report Orchestrator (Traffic Analysis & Leads Summary)", {
      route: "/reports/daily",
      dryRun,
      force,
    });

    // 1. Daily Traffic Analysis
    const trafficData = await getDailyTrafficService();
    let trafficEmailSent = false;
    let trafficDuplicateSkipped = false;
    let trafficMessage = "Traffic data generated";

    if (!dryRun) {
      const checkTraffic = canDispatchEmail("daily-traffic", { force });
      if (checkTraffic.allowed) {
        await sendDailyTrafficEmail(trafficData);
        recordEmailDispatch("daily-traffic", { date: trafficData.date });
        trafficEmailSent = true;
        trafficMessage = "Daily Traffic email dispatched";
      } else {
        trafficDuplicateSkipped = true;
        trafficMessage = checkTraffic.message || "Daily Traffic already sent today";
      }
    }

    // 2. Daily Leads Summary
    const leadsData = await getDailyLeadsService();
    let leadsEmailSent = false;
    let leadsDuplicateSkipped = false;
    let leadsMessage = "Leads data generated";

    if (!dryRun) {
      const checkLeads = canDispatchEmail("daily-leads", { force });
      if (checkLeads.allowed) {
        await sendDailyLeadsEmail(leadsData);
        recordEmailDispatch("daily-leads", { date: leadsData.date });
        leadsEmailSent = true;
        leadsMessage = "Daily Leads email dispatched";
      } else {
        leadsDuplicateSkipped = true;
        leadsMessage = checkLeads.message || "Daily Leads already sent today";
      }
    }

    const totalEmailsSent = (trafficEmailSent ? 1 : 0) + (leadsEmailSent ? 1 : 0);

    return sendRawOrWrapped(res, {
      success: true,
      report: "daily-dual-reports",
      policy: "Only 2 emails per day: Traffic Analysis & Leads Summary",
      date: trafficData.date || leadsData.date,
      traffic: {
        visitors: trafficData.visitors,
        sessions: trafficData.sessions,
        emailDispatched: trafficEmailSent,
        duplicateSkipped: trafficDuplicateSkipped,
        status: trafficMessage,
      },
      leads: {
        totalLeads: leadsData.totalLeads,
        totalEnquiries: leadsData.totalEnquiries,
        emailDispatched: leadsEmailSent,
        duplicateSkipped: leadsDuplicateSkipped,
        status: leadsMessage,
      },
      totalEmailsDispatched: totalEmailsSent,
      durationMs: Date.now() - start,
    });
  } catch (error: any) {
    logger.error("Daily Report execution error", {
      route: "/reports/daily",
      durationMs: Date.now() - start,
      error,
    });
    return sendError(res, 500, error.message || "Failed to execute daily reports", "INTERNAL_ERROR");
  }
}
