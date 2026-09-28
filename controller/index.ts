import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runSecurityMiddleware } from "../security";
import {
  handleDailyLeads,
  handleDailyTraffic,
  handleDailyStats,
  handleDailyPendingFollowup,
  handleDailyReport,
} from "./daily-controller";
import {
  handleWeeklyTraffic,
  handleWeeklyCareerApplications,
  handleWeeklyReport,
} from "./weekly-controller";
import {
  handleMonthlyTraffic,
  handleMonthlyCareerApplications,
  handleMonthlyReport,
} from "./monthly-controller";
import { handleCareerReport } from "./career-controller";
import { sendError, sendSuccess } from "../lib/response";
import { logger } from "../lib/logger";

export type ControllerHandler = (
  req: VercelRequest,
  res: VercelResponse
) => Promise<unknown>;

export interface RouteDefinition {
  path: string;
  service: string;
  description: string;
  handler: ControllerHandler;
  methods: string[];
}

/**
 * Canonical 3-Letter Controller Code Routing Map
 * Jira Automation calls ONLY /controller with one of these 3-letter codes.
 */
export const API_ROUTES: Record<string, RouteDefinition> = {
  // 1. Executive Full Reports
  DEX: {
    path: "/reports/daily",
    service: "daily-executive",
    description: "Daily Executive Analytics Brief Email & KPIs",
    handler: handleDailyReport,
    methods: ["POST", "GET"],
  },
  WEX: {
    path: "/reports/weekly",
    service: "weekly-executive",
    description: "Weekly Executive Analytics Brief Email & Trends",
    handler: handleWeeklyReport,
    methods: ["POST", "GET"],
  },
  MEX: {
    path: "/reports/monthly",
    service: "monthly-executive",
    description: "Monthly Executive Analytics Brief Email & Performance",
    handler: handleMonthlyReport,
    methods: ["POST", "GET"],
  },
  // 2. Career Pipeline
  CAR: {
    path: "/reports/career",
    service: "career-digest",
    description: "Monthly Career Digest & Resume Forwarding Pipeline",
    handler: handleCareerReport,
    methods: ["POST", "GET"],
  },
  // 3. Daily Micro-Reports
  DRL: {
    path: "/reports/daily/leads",
    service: "daily-leads",
    description: "Daily Lead Generation Report & Email",
    handler: handleDailyLeads,
    methods: ["POST", "GET"],
  },
  DRT: {
    path: "/reports/daily/traffic",
    service: "daily-traffic",
    description: "Daily Website Traffic & Hourly Trend Email",
    handler: handleDailyTraffic,
    methods: ["POST", "GET"],
  },
  DRS: {
    path: "/reports/daily/stats",
    service: "daily-stats",
    description: "Daily Executive KPIs, Comparison & Conversion Stats Email",
    handler: handleDailyStats,
    methods: ["POST", "GET"],
  },
  DPF: {
    path: "/reports/daily/pending-followup",
    service: "daily-pending-followup",
    description: "Daily Pending Follow-up Report & Email",
    handler: handleDailyPendingFollowup,
    methods: ["POST", "GET"],
  },
  // 4. Weekly Micro-Reports
  WRT: {
    path: "/reports/weekly/traffic",
    service: "weekly-traffic",
    description: "Weekly 7-Day Traffic vs Prior Week Email",
    handler: handleWeeklyTraffic,
    methods: ["POST", "GET"],
  },
  WCA: {
    path: "/reports/weekly/career-applications",
    service: "weekly-career-applications",
    description: "Weekly Career Applications Submitted Email",
    handler: handleWeeklyCareerApplications,
    methods: ["POST", "GET"],
  },
  // 5. Monthly Micro-Reports
  MRT: {
    path: "/reports/monthly/traffic",
    service: "monthly-traffic",
    description: "Monthly 30-Day Traffic Breakdown Email",
    handler: handleMonthlyTraffic,
    methods: ["POST", "GET"],
  },
  MCA: {
    path: "/reports/monthly/career-applications",
    service: "monthly-career-applications",
    description: "Monthly Career Applications Submitted Email",
    handler: handleMonthlyCareerApplications,
    methods: ["POST", "GET"],
  },
};

// Comprehensive aliases for Jira automation rules and user convenience
export const CODE_ALIASES: Record<string, string> = {
  DAY: "DEX",
  WEE: "WEX",
  MON: "MEX",
  MCD: "CAR",

  // Jira Rule Names & variations
  REPORT_WEEKLY_EXECUTIVE_EMAIL: "WEX",
  REPORTWEEKLYEXECUTIVEEMAIL: "WEX",
  WEEKLY_EXECUTIVE_EMAIL: "WEX",
  WEEKLYEXECUTIVEEMAIL: "WEX",
  WEEKLY_EXECUTIVE: "WEX",
  WEEKLYEXECUTIVE: "WEX",
  WEEKLY_REPORT: "WEX",
  WEEKLYREPORT: "WEX",
  WEEKLY: "WEX",

  REPORT_DAILY_EXECUTIVE_EMAIL: "DEX",
  REPORTDAILYEXECUTIVEEMAIL: "DEX",
  DAILY_EXECUTIVE_EMAIL: "DEX",
  DAILYEXECUTIVEEMAIL: "DEX",
  DAILY_EXECUTIVE: "DEX",
  DAILYEXECUTIVE: "DEX",
  DAILY_REPORT: "DEX",
  DAILYREPORT: "DEX",
  DAILY: "DEX",

  REPORT_MONTHLY_EXECUTIVE_EMAIL: "MEX",
  REPORTMONTHLYEXECUTIVEEMAIL: "MEX",
  MONTHLY_EXECUTIVE_EMAIL: "MEX",
  MONTHLYEXECUTIVEEMAIL: "MEX",
  MONTHLY_EXECUTIVE: "MEX",
  MONTHLYEXECUTIVE: "MEX",
  MONTHLY_REPORT: "MEX",
  MONTHLYREPORT: "MEX",
  MONTHLY: "MEX",

  REPORT_CAREER: "CAR",
  REPORTCAREER: "CAR",
  CAREER_DIGEST: "CAR",
  CAREERDIGEST: "CAR",
  CAREER: "CAR",

  // Micro-reports aliases
  REPORT_DAILY_LEADS: "DRL",
  REPORT_DAILY_TRAFFIC: "DRT",
  REPORT_DAILY_STATS: "DRS",
  REPORT_DAILY_PENDING_FOLLOWUP: "DPF",
  REPORT_WEEKLY_TRAFFIC: "WRT",
  REPORT_WEEKLY_CAREER_APPLICATIONS: "WCA",
  REPORT_MONTHLY_TRAFFIC: "MRT",
  REPORT_MONTHLY_CAREER_APPLICATIONS: "MCA",
  DRPF: "DPF",
};

/**
 * Controller Router Dispatcher
 * The central gateway for all Jira-triggered report executions.
 * Validates request, enforces code resolution, checks auth, and dispatches in-process.
 */
export async function dispatchController(
  req: VercelRequest,
  res: VercelResponse
) {
  const security = runSecurityMiddleware(req, res, {
    allowedMethods: ["POST", "GET"],
    requireAuth: true,
  });
  if (!security.passed) return;

  // Extract controller code from body (preferred for POST) or query string
  let rawCode =
    (req.body && typeof req.body === "object"
      ? req.body.code ||
        req.body.rule ||
        req.body.ruleName ||
        req.body.name ||
        req.body.action ||
        req.body.report ||
        req.body.trigger
      : undefined) ||
    (req.query.code as string) ||
    (req.query.rule as string) ||
    (req.query.ruleName as string) ||
    (req.query.name as string) ||
    (req.query.report as string);

  // Fallback: match URL path (e.g. /reports/daily/leads -> DRL)
  if (!rawCode) {
    const candidateUrls: string[] = [
      req.url,
      req.headers["x-matched-path"] as string,
      req.headers["x-forwarded-url"] as string,
    ].filter((u): u is string => typeof u === "string" && u.length > 0);

    for (const urlStr of candidateUrls) {
      const cleanUrl = urlStr.split("?")[0].replace(/\/$/, "");
      for (const [code, def] of Object.entries(API_ROUTES)) {
        if (cleanUrl.endsWith(def.path) || cleanUrl === def.path) {
          rawCode = code;
          break;
        }
      }
      if (rawCode) break;
    }
  }

  if (!rawCode) {
    // If no code is provided, return manifest of available 3-letter codes
    const manifest = Object.keys(API_ROUTES).map((code) => ({
      code,
      service: API_ROUTES[code].service,
      path: API_ROUTES[code].path,
      description: API_ROUTES[code].description,
      allowedMethods: API_ROUTES[code].methods,
    }));
    return sendSuccess(res, {
      message: "ISI Security Central API Controller Gateway",
      usage: 'POST /controller with JSON body: { "code": "<3-LETTER-CODE>" }',
      availableCodes: manifest,
    });
  }

  const rawUpper = String(rawCode).trim().toUpperCase();
  const stripped = rawUpper.replace(/[\s\-_]/g, "");
  const codeStr = CODE_ALIASES[rawUpper] || CODE_ALIASES[stripped] || rawUpper;

  const routeDef = API_ROUTES[codeStr];

  if (!routeDef) {
    if (!/^[A-Z]{3}$/.test(codeStr)) {
      logger.warn("Controller received invalid code length or format", {
        code: rawCode,
        resolved: codeStr,
      });
      return sendError(
        res,
        400,
        `Invalid controller code '${rawCode}'. Code must be exactly 3 uppercase letters (e.g., ${Object.keys(
          API_ROUTES
        ).join(", ")}).`,
        "INVALID_CODE_FORMAT"
      );
    }

    logger.warn("Unknown controller code requested", { code: rawCode, resolved: codeStr });
    return sendError(
      res,
      400,
      `Unknown 3-letter code '${codeStr}'. Supported codes: ${Object.keys(
        API_ROUTES
      ).join(", ")}`,
      "UNKNOWN_CONTROLLER_CODE"
    );
  }

  logger.info("Controller dispatching in-process service execution", {
    code: codeStr,
    service: routeDef.service,
    internalPath: routeDef.path,
    method: req.method,
  });

  return routeDef.handler(req, res);
}

export * from "./daily-controller";
export * from "./weekly-controller";
export * from "./monthly-controller";
export * from "./career-controller";
