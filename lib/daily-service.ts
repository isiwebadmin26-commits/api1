import {
  fetchAllSheetTabs,
  findMatchingSheetName,
  readSheetValues,
  getSpreadsheetUrl,
} from "./google-sheets";
import {
  aggregateExecutiveReportData,
  aggregateLeadsFromAllSources,
  formatDateKolkata,
  parseSheetDate,
  normalizeRoutePath,
  normalizeTrafficSource,
  runDailyReport,
} from "./analytics-report";

/**
 * Service for /reports/daily/leads
 * Aggregates lead form submissions for yesterday
 */
export async function getDailyLeadsService() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const allTabs = await fetchAllSheetTabs();

  const leadsData = await aggregateLeadsFromAllSources(
    allTabs,
    yesterday,
    yesterday,
    "DAILY",
    yesterday.getTime(),
    null
  );

  return {
    success: true,
    report: "daily-leads",
    date: formatDateKolkata(yesterday, "d MMMM yyyy"),
    totalLeads: leadsData.totalLeads,
    totalEnquiries: leadsData.totalEnquiries,
    bySource: leadsData.bySource,
    byPage: leadsData.byPage,
    byForm: leadsData.byForm,
    dashboardUrl: getSpreadsheetUrl(),
  };
}

/**
 * Service for /reports/daily/traffic
 * Aggregates traffic and page view statistics for yesterday
 */
export async function getDailyTrafficService() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const allTabs = await fetchAllSheetTabs();

  const trafficTab =
    findMatchingSheetName("Live_Traffic_Events", allTabs) ||
    findMatchingSheetName("Traffic_Analytics", allTabs) ||
    findMatchingSheetName("Page_Views", allTabs) ||
    findMatchingSheetName("Page Views", allTabs);

  const trafficData = trafficTab ? await readSheetValues(trafficTab.title) : [];
  const tHeaders = trafficData.length > 0 ? (trafficData[0] as string[]) : [];

  let tsCol = tHeaders.indexOf("Timestamp");
  if (tsCol === -1) tsCol = tHeaders.indexOf("timestamp");
  const ipCol = tHeaders.indexOf("IP Address");
  const pathCol =
    tHeaders.indexOf("Page Path") !== -1
      ? tHeaders.indexOf("Page Path")
      : tHeaders.indexOf("Page URL");
  const srcCol =
    tHeaders.indexOf("Traffic Source") !== -1
      ? tHeaders.indexOf("Traffic Source")
      : tHeaders.indexOf("Source");
  const sessCol = tHeaders.indexOf("Session ID");

  const startMs = yesterday.getTime();
  const endMs = yesterday.getTime() + 24 * 60 * 60 * 1000 - 1;

  const curSessions = new Set<string>();
  const curVisitors = new Set<string>();
  const curPages: Record<string, { path: string; visits: number; visitors: Set<string> }> = {};
  const curSources: Record<string, number> = {};

  const hourlyLabels = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
  const hourlyVisitors = [0, 0, 0, 0, 0, 0, 0, 0];

  for (let i = 1; i < trafficData.length; i++) {
    const row = trafficData[i];
    const ts = parseSheetDate(row[tsCol]);
    if (!ts) continue;

    const tTime = ts.getTime();
    if (tTime >= startMs && tTime <= endMs) {
      const ip = String(row[ipCol] || "").trim();
      const sess = String(row[sessCol] || ip || "SESS_" + i).trim();
      const rawPath = pathCol !== -1 ? String(row[pathCol] || "/") : "/";
      const cleanRoute = normalizeRoutePath(rawPath);
      const source = normalizeTrafficSource(row[srcCol]);

      curSessions.add(sess);
      if (ip) curVisitors.add(ip);

      if (!curPages[cleanRoute]) {
        curPages[cleanRoute] = { path: cleanRoute, visits: 0, visitors: new Set<string>() };
      }
      curPages[cleanRoute].visits++;
      if (ip) curPages[cleanRoute].visitors.add(ip);
      curSources[source] = (curSources[source] || 0) + 1;

      const istHours = (ts.getUTCHours() + 5.5) % 24;
      const bIdx = Math.min(7, Math.floor(istHours / 3));
      hourlyVisitors[bIdx]++;
    }
  }

  const topPagesList = Object.keys(curPages)
    .map((p) => ({
      path: curPages[p].path,
      views: curPages[p].visits,
      visitors: curPages[p].visitors.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const sourcesList = Object.keys(curSources)
    .map((s) => ({
      source: s,
      count: curSources[s],
    }))
    .sort((a, b) => b.count - a.count);

  return {
    success: true,
    report: "daily-traffic",
    date: formatDateKolkata(yesterday, "d MMMM yyyy"),
    visitors: curVisitors.size || curSessions.size || 0,
    sessions: curSessions.size || curVisitors.size || 0,
    topPages: topPagesList,
    sources: sourcesList,
    trend: {
      labels: hourlyLabels,
      visitors: hourlyVisitors,
    },
  };
}

/**
 * Service for /reports/daily/stats
 * Aggregates daily executive KPI statistics & comparisons
 */
export async function getDailyStatsService() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const dayBefore = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const reportData = await aggregateExecutiveReportData(
    "DAILY",
    yesterday,
    yesterday,
    dayBefore,
    dayBefore
  );

  return {
    success: true,
    report: "daily-stats",
    date: reportData.periodDateStr,
    kpis: reportData.kpis,
    comparison: reportData.comparison,
    formBreakdown: reportData.formBreakdown,
    topPages: reportData.topPages,
    sources: reportData.sources,
    trend: reportData.trend,
  };
}

/**
 * Service for /reports/daily/pending-followup
 * Identifies recent leads requiring follow-up action
 */
export async function getDailyPendingFollowupService() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const allTabs = await fetchAllSheetTabs();

  const LEAD_SOURCES = [
    "Contact_Leads",
    "Quick_Enquiry_Leads",
    "Talk_To_Architect",
    "Workshop_Requests",
    "RFP_Proposals",
    "AI_Diagnostic_Leads",
  ];

  const pendingItems: Array<{
    category: string;
    name: string;
    email: string;
    phone: string;
    date: string;
    source: string;
  }> = [];

  for (const sheetName of LEAD_SOURCES) {
    const tab = findMatchingSheetName(sheetName, allTabs);
    if (!tab) continue;

    const data = await readSheetValues(tab.title);
    if (!data || data.length < 2) continue;

    const headers = data[0] as string[];
    let tsCol = headers.indexOf("Timestamp");
    if (tsCol === -1) tsCol = headers.indexOf("timestamp");
    const nameCol = headers.indexOf("Name") !== -1 ? headers.indexOf("Name") : headers.indexOf("Full Name");
    const emailCol = headers.indexOf("Email");
    const phoneCol = headers.indexOf("Phone") !== -1 ? headers.indexOf("Phone") : headers.indexOf("Mobile");
    const srcCol = headers.indexOf("Source") !== -1 ? headers.indexOf("Source") : headers.indexOf("UTM Source");

    const sTime = yesterday.getTime();
    const eTime = yesterday.getTime() + 24 * 60 * 60 * 1000 - 1;

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const ts = parseSheetDate(row[tsCol]);
      if (!ts) continue;

      if (ts.getTime() >= sTime && ts.getTime() <= eTime) {
        pendingItems.push({
          category: tab.title,
          name: nameCol !== -1 ? String(row[nameCol] || "Lead") : "Lead",
          email: emailCol !== -1 ? String(row[emailCol] || "") : "",
          phone: phoneCol !== -1 ? String(row[phoneCol] || "") : "",
          date: formatDateKolkata(ts, "dd-MMM-yyyy HH:mm"),
          source: srcCol !== -1 ? normalizeTrafficSource(row[srcCol]) : "Direct",
        });
      }
    }
  }

  return {
    success: true,
    report: "daily-pending-followup",
    date: formatDateKolkata(yesterday, "d MMMM yyyy"),
    count: pendingItems.length,
    pendingFollowups: pendingItems,
  };
}

/**
 * Executes the full daily report (with email generation/dispatch)
 */
export async function executeDailyReportService({ dryRun = false }: { dryRun?: boolean } = {}) {
  return runDailyReport({ dryRun });
}
