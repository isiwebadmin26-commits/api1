import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "./logger";

export type ReportFrequencyType =
  | "daily-traffic"
  | "daily-leads"
  | "weekly"
  | "monthly"
  | "monthly-career";

interface DispatchRecord {
  reportType: ReportFrequencyType;
  key: string;
  dispatchedAt: string;
  details?: Record<string, any>;
}

// In-memory record store (fast lookup in current node process)
const memoryStore = new Map<string, DispatchRecord>();

// Determine a writable cache path for persistent tracking across serverless warm invocations
function getStorageFilePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "isi-email-dispatch-history.json");
  }
  return path.join(process.cwd(), ".email-dispatch-history.json");
}

function loadHistoryFromDisk(): void {
  try {
    const filePath = getStorageFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const list: DispatchRecord[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.key) {
            memoryStore.set(item.key, item);
          }
        }
      }
    }
  } catch (err: any) {
    logger.warn("Could not read dispatch history from disk (using in-memory store)", {
      error: err.message,
    });
  }
}

function saveHistoryToDisk(): void {
  try {
    const filePath = getStorageFilePath();
    const list = Array.from(memoryStore.values());
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf8");
  } catch (err: any) {
    logger.warn("Could not persist dispatch history to disk", { error: err.message });
  }
}

// Initialize on module load
loadHistoryFromDisk();

/**
 * Returns current Date components in Asia/Kolkata (IST: UTC+5:30) timezone.
 */
export function getKolkataTimeComponents(d: Date = new Date()): {
  year: number;
  month: string;
  day: string;
  dateStr: string;
  weekStr: string;
  monthStr: string;
} {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffsetMs);

  const year = istDate.getUTCFullYear();
  const monthNum = istDate.getUTCMonth() + 1;
  const month = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
  const dayNum = istDate.getUTCDate();
  const day = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;

  const dateStr = `${year}-${month}-${day}`;
  const monthStr = `${year}-${month}`;

  // ISO Week calculation for IST
  const target = new Date(istDate.getTime());
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNr = 1 + Math.ceil((firstThursday - target.getTime()) / (7 * 24 * 3600 * 1000));
  const weekStr = `${year}-W${weekNr < 10 ? `0${weekNr}` : weekNr}`;

  return { year, month, day, dateStr, weekStr, monthStr };
}

/**
 * Generates deduplication key based on report type and IST schedule window:
 * - daily-traffic -> 'daily-traffic:YYYY-MM-DD'
 * - daily-leads   -> 'daily-leads:YYYY-MM-DD'
 * - weekly        -> 'weekly:YYYY-Wxx' (once per ISO week)
 * - monthly       -> 'monthly:YYYY-MM' (once per calendar month)
 * - monthly-career-> 'monthly-career:YYYY-MM'
 */
export function getDeduplicationKey(reportType: ReportFrequencyType, d: Date = new Date()): string {
  const ist = getKolkataTimeComponents(d);
  switch (reportType) {
    case "daily-traffic":
    case "daily-leads":
      return `${reportType}:${ist.dateStr}`;
    case "weekly":
      return `${reportType}:${ist.weekStr}`;
    case "monthly":
    case "monthly-career":
      return `${reportType}:${ist.monthStr}`;
  }
}

export interface CheckDispatchResult {
  allowed: boolean;
  key: string;
  reason?: "ALREADY_SENT" | "ALLOWED" | "FORCED";
  alreadySentAt?: string;
  message?: string;
}

/**
 * Checks whether an email for this report type can be dispatched according to the strict rule:
 * - Daily: Max 1 traffic + 1 leads email per day (total 2 emails per day)
 * - Weekly: Max 1 weekly email once a week
 * - Monthly: Max 1 monthly email once a month
 *
 * If force is true, bypasses the check.
 */
export function canDispatchEmail(
  reportType: ReportFrequencyType,
  options: { force?: boolean } = {}
): CheckDispatchResult {
  const key = getDeduplicationKey(reportType);

  if (options.force) {
    return {
      allowed: true,
      key,
      reason: "FORCED",
      message: `Force flag supplied; overriding deduplication for '${key}'.`,
    };
  }

  const existing = memoryStore.get(key);
  if (existing) {
    let friendlyPeriod = "";
    if (reportType.startsWith("daily")) {
      friendlyPeriod = "today";
    } else if (reportType.startsWith("weekly")) {
      friendlyPeriod = "this week";
    } else {
      friendlyPeriod = "this month";
    }

    return {
      allowed: false,
      key,
      reason: "ALREADY_SENT",
      alreadySentAt: existing.dispatchedAt,
      message: `Duplicate prevented: '${reportType}' has already been dispatched ${friendlyPeriod} (at ${existing.dispatchedAt}). Only 1 per period allowed.`,
    };
  }

  return {
    allowed: true,
    key,
    reason: "ALLOWED",
  };
}

/**
 * Records that an email was successfully dispatched for this report type.
 */
export function recordEmailDispatch(
  reportType: ReportFrequencyType,
  details?: Record<string, any>
): DispatchRecord {
  const key = getDeduplicationKey(reportType);
  const record: DispatchRecord = {
    reportType,
    key,
    dispatchedAt: new Date().toISOString(),
    details,
  };

  memoryStore.set(key, record);
  saveHistoryToDisk();

  logger.info(`[EmailDedup] Recorded email dispatch`, {
    reportType,
    key,
    dispatchedAt: record.dispatchedAt,
  });

  return record;
}

/**
 * Reset / clear history (primarily for automated tests).
 */
export function clearDispatchHistory(): void {
  memoryStore.clear();
  try {
    const filePath = getStorageFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}
