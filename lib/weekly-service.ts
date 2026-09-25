import {
  fetchAllSheetTabs,
  findMatchingSheetName,
  readSheetValues,
  getSpreadsheetUrl,
} from "./google-sheets";
import {
  aggregateExecutiveReportData,
  formatDateKolkata,
  parseSheetDate,
  runWeeklyReport,
} from "./analytics-report";

/**
 * Service for /reports/weekly/traffic
 * Aggregates 7-day traffic performance vs previous week
 */
export async function getWeeklyTrafficService() {
  const now = new Date();
  const w1Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const w1End = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const w2Start = new Date(w1Start.getTime() - 7 * 24 * 60 * 60 * 1000);
  const w2End = new Date(w1Start.getTime() - 1 * 24 * 60 * 60 * 1000);

  const reportData = await aggregateExecutiveReportData(
    "WEEKLY",
    w1Start,
    w1End,
    w2Start,
    w2End
  );

  return {
    success: true,
    report: "weekly-traffic",
    period: reportData.periodRangeStr,
    visitors: reportData.kpis.visitors,
    sessions: reportData.kpis.sessions,
    comparison: {
      visitorsDelta: reportData.comparison.visitorsDelta,
      sessionsDelta: reportData.comparison.sessionsDelta,
      prevVisitors: reportData.comparison.prevVisitors,
    },
    topPages: reportData.topPages,
    sources: reportData.sources,
    trend: reportData.trend,
  };
}

/**
 * Service for /reports/weekly/career-applications
 * Aggregates career applications received in past 7 days
 */
export async function getWeeklyCareerApplicationsService() {
  const allTabs = await fetchAllSheetTabs();
  const careerTab =
    findMatchingSheetName("CareerApplications", allTabs) ||
    findMatchingSheetName("Career_Applications", allTabs);

  if (!careerTab) {
    return {
      success: true,
      report: "weekly-career-applications",
      candidatesCount: 0,
      candidates: [],
      message: "CareerApplications sheet not found.",
    };
  }

  const data = await readSheetValues(careerTab.title);
  if (!data || data.length < 2) {
    return {
      success: true,
      report: "weekly-career-applications",
      candidatesCount: 0,
      candidates: [],
    };
  }

  const headers = data[0] as string[];
  const nameCol = headers.indexOf("Name");
  const emailCol = headers.indexOf("Email");
  const phoneCol = headers.indexOf("Phone");
  const jobTitleCol = headers.indexOf("Job Title");
  const resumeNameCol = headers.indexOf("Resume File Name");
  const driveLinkCol = headers.indexOf("Resume Drive Link");
  let tsCol = headers.indexOf("Timestamp");
  if (tsCol === -1) tsCol = headers.indexOf("timestamp");

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const candidates: Array<{
    name: string;
    email: string;
    phone: string;
    jobTitle: string;
    resumeName: string;
    driveLink: string;
    date: string;
  }> = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const ts = parseSheetDate(row[tsCol]);

    if (ts && ts >= sevenDaysAgo) {
      candidates.push({
        name: row[nameCol] || "Applicant",
        email: row[emailCol] || "",
        phone: row[phoneCol] || "",
        jobTitle: row[jobTitleCol] || "General Role",
        resumeName: row[resumeNameCol] || "Resume.pdf",
        driveLink: (driveLinkCol !== -1 ? row[driveLinkCol] : "") || "",
        date: formatDateKolkata(ts, "dd-MMM-yyyy"),
      });
    }
  }

  return {
    success: true,
    report: "weekly-career-applications",
    period: `${formatDateKolkata(sevenDaysAgo, "d MMM yyyy")} - ${formatDateKolkata(now, "d MMM yyyy")}`,
    candidatesCount: candidates.length,
    candidates,
    dashboardUrl: getSpreadsheetUrl(),
  };
}

/**
 * Executes the full weekly report (with email generation/dispatch)
 */
export async function executeWeeklyReportService({ dryRun = false }: { dryRun?: boolean } = {}) {
  return runWeeklyReport({ dryRun });
}
