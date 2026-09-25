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
  runMonthlyReport,
} from "./analytics-report";

/**
 * Service for /reports/monthly/traffic
 * Aggregates 30-day traffic performance vs previous 30 days
 */
export async function getMonthlyTrafficService() {
  const now = new Date();
  const m1Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const m1End = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const m2Start = new Date(m1Start.getTime() - 30 * 24 * 60 * 60 * 1000);
  const m2End = new Date(m1Start.getTime() - 1 * 24 * 60 * 60 * 1000);

  const reportData = await aggregateExecutiveReportData(
    "MONTHLY",
    m1Start,
    m1End,
    m2Start,
    m2End
  );

  return {
    success: true,
    report: "monthly-traffic",
    month: formatDateKolkata(m1End, "MMMM yyyy"),
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
 * Service for /reports/monthly/career-applications
 * Aggregates career applications received in past 30 days
 */
export async function getMonthlyCareerApplicationsService() {
  const allTabs = await fetchAllSheetTabs();
  const careerTab =
    findMatchingSheetName("CareerApplications", allTabs) ||
    findMatchingSheetName("Career_Applications", allTabs);

  if (!careerTab) {
    return {
      success: true,
      report: "monthly-career-applications",
      candidatesCount: 0,
      candidates: [],
      message: "CareerApplications sheet not found.",
    };
  }

  const data = await readSheetValues(careerTab.title);
  if (!data || data.length < 2) {
    return {
      success: true,
      report: "monthly-career-applications",
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
  const thirtyDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

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

    if (ts && ts >= thirtyDaysAgo) {
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
    report: "monthly-career-applications",
    month: formatDateKolkata(now, "MMMM yyyy"),
    candidatesCount: candidates.length,
    candidates,
    dashboardUrl: getSpreadsheetUrl(),
  };
}

/**
 * Executes the full monthly report (with email generation/dispatch)
 */
export async function executeMonthlyReportService({ dryRun = false }: { dryRun?: boolean } = {}) {
  return runMonthlyReport({ dryRun });
}
