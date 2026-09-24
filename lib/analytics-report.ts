import {
  fetchAllSheetTabs,
  findMatchingSheetName,
  readSheetValues,
  getSpreadsheetUrl,
  SheetTabInfo,
} from "./google-sheets";
import { sendEmail, cleanEmailText, getReportRecipients } from "./email";

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Format date in Asia/Kolkata timezone faithful to Apps Script Utilities.formatDate.
 */
export function formatDateKolkata(date: Date, pattern: string): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  const day = istDate.getUTCDate();
  const dayStr = String(day).padStart(2, "0");
  const monthIdx = istDate.getUTCMonth();
  const year = istDate.getUTCFullYear();

  switch (pattern) {
    case "d MMMM yyyy":
      return `${day} ${MONTHS_FULL[monthIdx]} ${year}`;
    case "d MMM yyyy":
      return `${day} ${MONTHS_SHORT[monthIdx]} ${year}`;
    case "d MMM":
      return `${day} ${MONTHS_SHORT[monthIdx]}`;
    case "MMMM yyyy":
      return `${MONTHS_FULL[monthIdx]} ${year}`;
    case "dd-MMM-yyyy":
      return `${dayStr}-${MONTHS_SHORT[monthIdx]}-${year}`;
    default:
      return `${day} ${MONTHS_SHORT[monthIdx]} ${year}`;
  }
}

/**
 * Normalizes any route or full URL down to a clean, canonical route/sub-route without query parameters or domains.
 */
export function normalizeRoutePath(rawPathOrUrl: unknown): string {
  if (!rawPathOrUrl) return "/";
  let str = String(rawPathOrUrl).trim();
  // Strip domain if present (e.g. http://trustgrid.ai/solutions/... or https://www.trustgrid.ai/...)
  str = str.replace(/^https?:\/\/[^\/]+/i, "");
  // Strip query parameters (?utm_source=... etc) and hash fragments (#...)
  str = str.split("?")[0].split("#")[0].trim();
  if (!str || str === "") return "/";
  // Remove trailing slash unless it's just "/"
  if (str.length > 1 && str.endsWith("/")) {
    str = str.replace(/\/+$/, "");
  }
  if (!str.startsWith("/")) {
    str = "/" + str;
  }
  return str;
}

/**
 * Categorizes form types strictly into Quick Forms, Consulting Sessions, or standard secondary categories.
 */
export function getFormCategoryLabel(nameOrType: unknown): string {
  const s = String(nameOrType || "").toLowerCase().trim();
  if (
    s.indexOf("quick") !== -1 ||
    s.indexOf("floating") !== -1 ||
    s === "quick_enquiry_leads" ||
    s === "floating_lead"
  ) {
    return "Quick Forms";
  }
  if (
    s.indexOf("career") !== -1 ||
    s.indexOf("candidate") !== -1 ||
    s === "career_applications"
  ) {
    return "Career Applications";
  }
  if (s.indexOf("partner") !== -1 || s === "partner_applications") {
    return "Partner Applications";
  }
  if (s.indexOf("newsletter") !== -1 || s === "newsletter_subscribers") {
    return "Newsletter Subscribers";
  }
  if (s.indexOf("chatbot") !== -1 || s === "chatbot_leads") {
    return "Chatbot Inquiries";
  }
  return "Consulting Sessions";
}

/**
 * Builds a single combined QuickChart line chart URL for dual-trend visualization.
 */
export function generateMergedTrendChartUrl(
  labels: string[],
  seriesVisitors: number[],
  seriesLeads: number[]
): string {
  const chartConfig = {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Visitors / Sessions",
          data: seriesVisitors,
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.08)",
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: "#6366f1",
          fill: false,
          tension: 0.25,
        },
        {
          label: "Leads Captured",
          data: seriesLeads,
          borderColor: "#059669",
          backgroundColor: "rgba(5, 150, 105, 0.08)",
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: "#059669",
          fill: false,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      legend: {
        display: true,
        position: "top",
        labels: {
          fontColor: "#334155",
          fontSize: 11,
          boxWidth: 12,
          usePointStyle: true,
        },
      },
      scales: {
        xAxes: [
          {
            gridLines: { color: "rgba(226, 232, 240, 0.6)", zeroLineColor: "#cbd5e1" },
            ticks: { fontColor: "#64748b", fontSize: 10 },
          },
        ],
        yAxes: [
          {
            gridLines: { color: "rgba(226, 232, 240, 0.6)", zeroLineColor: "#cbd5e1" },
            ticks: { fontColor: "#64748b", fontSize: 10, beginAtZero: true, precision: 0 },
          },
        ],
      },
    },
  };

  return (
    "https://quickchart.io/chart?c=" +
    encodeURIComponent(JSON.stringify(chartConfig)) +
    "&w=580&h=250&bkg=white&devicePixelRatio=2"
  );
}

export function calculateDelta(cur: number, prev: number): string {
  if (!prev || prev === 0) return cur > 0 ? "+100%" : "0.0%";
  const change = ((cur - prev) / prev) * 100;
  return (change >= 0 ? "+" : "") + change.toFixed(1) + "%";
}

export function formatNum(num: unknown): string {
  if (num === null || num === undefined || isNaN(Number(num))) return "0";
  return Number(num).toLocaleString("en-IN");
}

export function parseSheetDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const str = String(val).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(str.substring(0, 10));
  }
  const match = str.match(
    /^(\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})/i
  );
  if (match) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    return new Date(Number(match[3]), months[match[2].toLowerCase()], Number(match[1]));
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeTrafficSource(src: unknown, utmSrc?: unknown): string {
  const s = String(src || utmSrc || "").toLowerCase().trim();
  if (s.indexOf("google_ad") !== -1 || s.indexOf("cpc") !== -1 || s.indexOf("adwords") !== -1)
    return "Google Ads";
  if (s.indexOf("linkedin") !== -1) return "LinkedIn";
  if (s.indexOf("twitter") !== -1 || s.indexOf("x.com") !== -1) return "X / Twitter";
  if (s.indexOf("organic") !== -1 || s.indexOf("google") !== -1 || s.indexOf("search") !== -1)
    return "Organic Search";
  if (s.indexOf("referral") !== -1) return "Referral";
  return "Direct / Unknown";
}

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface LeadsAggregationResult {
  totalLeads: number;
  totalEnquiries: number;
  bySource: Record<string, { leads: number; enquiries: number }>;
  byPage: Record<string, number>;
  byForm: Record<string, number>;
}

export async function aggregateLeadsFromAllSources(
  allTabs: SheetTabInfo[],
  startDate: Date,
  endDate: Date,
  periodType: string,
  startMs: number,
  trendLeadsRef: number[] | null
): Promise<LeadsAggregationResult> {
  const sTime = startDate.getTime();
  const eTime = endDate.getTime() + 24 * 60 * 60 * 1000 - 1;

  const result: LeadsAggregationResult = {
    totalLeads: 0,
    totalEnquiries: 0,
    bySource: {},
    byPage: {},
    byForm: {
      "Quick Forms": 0,
      "Consulting Sessions": 0,
    },
  };

  const FORM_SOURCES = [
    { canonical: "Contact_Leads", isLead: true, category: "Consulting Sessions" },
    { canonical: "AI_Diagnostic_Leads", isLead: true, category: "Consulting Sessions" },
    { canonical: "AI_Readiness_Leads", isLead: true, category: "Consulting Sessions" },
    { canonical: "Workshop_Requests", isLead: true, category: "Consulting Sessions" },
    { canonical: "RFP_Proposals", isLead: true, category: "Consulting Sessions" },
    { canonical: "Talk_To_Architect", isLead: true, category: "Consulting Sessions" },
    { canonical: "Google_Ad_Leads", isLead: true, category: "Consulting Sessions" },
    { canonical: "Quick_Enquiry_Leads", isLead: true, category: "Quick Forms" },
    { canonical: "Career_Applications", isLead: false, isEnquiry: true, category: "Career Applications" },
    { canonical: "Partner_Applications", isLead: true, category: "Partner Applications" },
    { canonical: "Chatbot_Leads", isLead: false, isEnquiry: true, category: "Chatbot Inquiries" },
    { canonical: "Newsletter_Subscribers", isLead: false, isEnquiry: true, category: "Newsletter Subscribers" },
  ];

  const visitedSheets = new Set<number>();

  for (const item of FORM_SOURCES) {
    const tab = findMatchingSheetName(item.canonical, allTabs);
    if (!tab) continue;
    if (visitedSheets.has(tab.sheetId)) continue;
    visitedSheets.add(tab.sheetId);

    const data = await readSheetValues(tab.title);
    if (!data || data.length < 2) continue;
    const headers = data[0] as string[];

    let tsCol = headers.indexOf("Timestamp");
    if (tsCol === -1) tsCol = headers.indexOf("timestamp");
    if (tsCol === -1) continue;

    const srcCol = headers.indexOf("Source") !== -1 ? headers.indexOf("Source") : headers.indexOf("UTM Source");
    const pageCol = headers.indexOf("Page") !== -1 ? headers.indexOf("Page") : headers.indexOf("Page Path");

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const ts = parseSheetDate(row[tsCol]);
      if (!ts) continue;
      const tTime = ts.getTime();
      if (tTime >= sTime && tTime <= eTime) {
        if (item.isLead) result.totalLeads++;
        result.totalEnquiries++;

        const categoryLabel = item.category || getFormCategoryLabel(item.canonical);
        result.byForm[categoryLabel] = (result.byForm[categoryLabel] || 0) + 1;

        const rawSrc = srcCol !== -1 ? row[srcCol] : "Direct";
        const normSrc = normalizeTrafficSource(rawSrc);
        if (!result.bySource[normSrc]) {
          result.bySource[normSrc] = { leads: 0, enquiries: 0 };
        }
        if (item.isLead) result.bySource[normSrc].leads++;
        result.bySource[normSrc].enquiries++;

        const rawPage = pageCol !== -1 ? String(row[pageCol] || "/") : "/";
        const cleanRoute = normalizeRoutePath(rawPage);
        result.byPage[cleanRoute] = (result.byPage[cleanRoute] || 0) + 1;

        // Trend aggregation bucket
        if (trendLeadsRef && item.isLead) {
          if (periodType === "DAILY") {
            const istHours = (ts.getUTCHours() + 5.5) % 24;
            const bIdx = Math.min(7, Math.floor(istHours / 3));
            trendLeadsRef[bIdx]++;
          } else if (startMs) {
            const dayDiff = Math.floor((tTime - startMs) / (24 * 60 * 60 * 1000));
            if (dayDiff >= 0 && dayDiff < 7) {
              trendLeadsRef[dayDiff]++;
            }
          }
        }
      }
    }
  }

  return result;
}

export interface ExecutiveReportData {
  periodType: string;
  periodDateStr: string;
  periodRangeStr: string;
  kpis: {
    visitors: number;
    sessions: number;
    leads: number;
    enquiries: number;
    conversionRate: string;
    topLeadSource: string;
  };
  comparison: {
    visitorsDelta: string;
    sessionsDelta: string;
    leadsDelta: string;
    enquiriesDelta: string;
    prevVisitors: number;
    prevLeads: number;
    prevEnquiries: number;
    prevConvRate: string;
  };
  trend: {
    labels: string[];
    visitors: number[];
    leads: number[];
    chartUrl: string;
  };
  formBreakdown: Record<string, number>;
  sources: Array<{
    source: string;
    visitors: number;
    leads: number;
    enquiries: number;
    convRate: string;
  }>;
  topPages: Array<{
    path: string;
    views: number;
    visitors: number;
    leads: number;
  }>;
  dashboardUrl: string;
}

export async function aggregateExecutiveReportData(
  periodType: "WEEKLY" | "MONTHLY" | "DAILY",
  startDate: Date,
  endDate: Date,
  prevStartDate: Date,
  prevEndDate: Date
): Promise<ExecutiveReportData> {
  const periodDateStr =
    periodType === "DAILY"
      ? formatDateKolkata(endDate, "d MMMM yyyy")
      : `${formatDateKolkata(startDate, "d MMMM yyyy")} - ${formatDateKolkata(endDate, "d MMMM yyyy")}`;
  const periodRangeStr = `${formatDateKolkata(startDate, "d MMM yyyy")} - ${formatDateKolkata(endDate, "d MMM yyyy")}`;

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
  const pathCol = tHeaders.indexOf("Page Path") !== -1 ? tHeaders.indexOf("Page Path") : tHeaders.indexOf("Page URL");
  const srcCol = tHeaders.indexOf("Traffic Source") !== -1 ? tHeaders.indexOf("Traffic Source") : tHeaders.indexOf("Source");
  const sessCol = tHeaders.indexOf("Session ID");

  const curSessions = new Set<string>();
  const curVisitors = new Set<string>();
  const curPages: Record<string, { path: string; visits: number; visitors: Set<string> }> = {};
  const curSources: Record<string, number> = {};

  const prevSessions = new Set<string>();
  const prevVisitors = new Set<string>();

  // Setup Merged Trend Buckets
  const trendLabels: string[] = [];
  const trendVisitors: number[] = [];
  const trendLeads: number[] = [];

  const startMs = startDate.getTime();
  const endMs = endDate.getTime() + 24 * 60 * 60 * 1000 - 1;

  if (periodType === "DAILY") {
    trendLabels.push("00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00");
    trendVisitors.push(0, 0, 0, 0, 0, 0, 0, 0);
    trendLeads.push(0, 0, 0, 0, 0, 0, 0, 0);
  } else {
    // Weekly 7 daily intervals
    for (let d = 0; d < 7; d++) {
      const dObj = new Date(startMs + d * 24 * 60 * 60 * 1000);
      trendLabels.push(formatDateKolkata(dObj, "d MMM"));
      trendVisitors.push(0);
      trendLeads.push(0);
    }
  }

  for (let i = 1; i < trafficData.length; i++) {
    const row = trafficData[i];
    const ts = parseSheetDate(row[tsCol]);
    if (!ts) continue;
    const ip = String(row[ipCol] || "").trim();
    const sess = String(row[sessCol] || ip || "SESS_" + i).trim();
    const rawPath = pathCol !== -1 ? String(row[pathCol] || "/") : "/";
    const cleanRoute = normalizeRoutePath(rawPath);
    const source = normalizeTrafficSource(row[srcCol]);

    const tTime = ts.getTime();
    if (tTime >= startMs && tTime <= endMs) {
      curSessions.add(sess);
      if (ip) curVisitors.add(ip);

      if (!curPages[cleanRoute]) {
        curPages[cleanRoute] = { path: cleanRoute, visits: 0, visitors: new Set<string>() };
      }
      curPages[cleanRoute].visits++;
      if (ip) curPages[cleanRoute].visitors.add(ip);
      curSources[source] = (curSources[source] || 0) + 1;

      // Bucket for trend chart
      if (periodType === "DAILY") {
        const istHours = (ts.getUTCHours() + 5.5) % 24;
        const bIdx = Math.min(7, Math.floor(istHours / 3));
        trendVisitors[bIdx]++;
      } else {
        const dayDiff = Math.floor((tTime - startMs) / (24 * 60 * 60 * 1000));
        if (dayDiff >= 0 && dayDiff < 7) {
          trendVisitors[dayDiff]++;
        }
      }
    } else if (
      tTime >= prevStartDate.getTime() &&
      tTime <= new Date(prevEndDate.getTime() + 24 * 60 * 60 * 1000 - 1).getTime()
    ) {
      prevSessions.add(sess);
      if (ip) prevVisitors.add(ip);
    }
  }

  const currentLeadsData = await aggregateLeadsFromAllSources(
    allTabs,
    startDate,
    endDate,
    periodType,
    startMs,
    trendLeads
  );
  const previousLeadsData = await aggregateLeadsFromAllSources(
    allTabs,
    prevStartDate,
    prevEndDate,
    periodType,
    prevStartDate.getTime(),
    null
  );

  const curVisitorsCount = curVisitors.size || curSessions.size || 0;
  const curSessionsCount = curSessions.size || curVisitorsCount || 0;
  const prevVisitorsCount = prevVisitors.size || prevSessions.size || 0;
  const prevSessionsCount = prevSessions.size || prevVisitorsCount || 0;

  const curLeadsCount = currentLeadsData.totalLeads;
  const prevLeadsCount = previousLeadsData.totalLeads;
  const curEnquiriesCount = currentLeadsData.totalEnquiries;
  const prevEnquiriesCount = previousLeadsData.totalEnquiries;

  const curConvRate =
    curSessionsCount > 0 ? ((curLeadsCount / curSessionsCount) * 100).toFixed(2) : "0.00";
  const prevConvRate =
    prevSessionsCount > 0 ? ((prevLeadsCount / prevSessionsCount) * 100).toFixed(2) : "0.00";

  const sourceList = Object.keys(curSources)
    .map((src) => {
      const vCount = curSources[src];
      const lCount = currentLeadsData.bySource[src] ? currentLeadsData.bySource[src].leads : 0;
      const eCount = currentLeadsData.bySource[src] ? currentLeadsData.bySource[src].enquiries : 0;
      const cRate = vCount > 0 ? ((lCount / vCount) * 100).toFixed(1) : "0.0";
      return { source: src, visitors: vCount, leads: lCount, enquiries: eCount, convRate: cRate + "%" };
    })
    .sort((a, b) => b.visitors - a.visitors);

  const topLeadSource = sourceList.length > 0 ? sourceList[0].source : "Direct / Organic";

  // Build clean TOP ENGAGED PAGES list: Route only, sorted by views descending
  const topPagesList = Object.keys(curPages)
    .map((p) => {
      const item = curPages[p];
      return {
        path: item.path,
        views: item.visits,
        visitors: item.visitors.size,
        leads: currentLeadsData.byPage[item.path] || 0,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Generate merged trend chart URL
  const mergedChartUrl = generateMergedTrendChartUrl(trendLabels, trendVisitors, trendLeads);

  return {
    periodType,
    periodDateStr,
    periodRangeStr,
    kpis: {
      visitors: curVisitorsCount,
      sessions: curSessionsCount,
      leads: curLeadsCount,
      enquiries: curEnquiriesCount,
      conversionRate: curConvRate + "%",
      topLeadSource: topLeadSource,
    },
    comparison: {
      visitorsDelta: calculateDelta(curVisitorsCount, prevVisitorsCount),
      sessionsDelta: calculateDelta(curSessionsCount, prevSessionsCount),
      leadsDelta: calculateDelta(curLeadsCount, prevLeadsCount),
      enquiriesDelta: calculateDelta(curEnquiriesCount, prevEnquiriesCount),
      prevVisitors: prevVisitorsCount,
      prevLeads: prevLeadsCount,
      prevEnquiries: prevEnquiriesCount,
      prevConvRate: prevConvRate + "%",
    },
    trend: {
      labels: trendLabels,
      visitors: trendVisitors,
      leads: trendLeads,
      chartUrl: mergedChartUrl,
    },
    formBreakdown: currentLeadsData.byForm,
    sources: sourceList,
    topPages: topPagesList,
    dashboardUrl: getSpreadsheetUrl(),
  };
}

export function buildExecutiveAnalyticsBriefHtml(
  data: ExecutiveReportData,
  periodType: "WEEKLY" | "MONTHLY" | "DAILY"
): string {
  const k = data.kpis;
  const mainHeading =
    periodType === "DAILY"
      ? "DAILY ANALYTICS REPORT"
      : periodType === "WEEKLY"
      ? "WEEKLY ANALYTICS REPORT"
      : "MONTHLY ANALYTICS REPORT";
  const trendHeading =
    periodType === "DAILY"
      ? "TREND ANALYSIS"
      : periodType === "WEEKLY"
      ? "WEEKLY TREND ANALYSIS"
      : "MONTHLY TREND ANALYSIS";
  const subtitle =
    periodType === "DAILY"
      ? "Daily Executive Performance Summary &bull; " + cleanEmailText(data.periodDateStr)
      : periodType === "WEEKLY"
      ? "Weekly Executive Performance Summary &bull; " + cleanEmailText(data.periodRangeStr)
      : "Monthly Executive Performance Summary &bull; " + cleanEmailText(data.periodDateStr);

  // TOP ENGAGED PAGES rows
  const pageRows = (data.topPages || [])
    .map(
      (p) =>
        '<tr style="border-bottom: 1px solid #f1f5f9;">' +
        '  <td style="padding: 9px 12px; font-size: 13px; font-weight: 600; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, monospace;">' +
        escapeHtml(p.path) +
        "</td>" +
        '  <td style="padding: 9px 12px; font-size: 13px; font-weight: 700; text-align: right; color: #6366f1;">' +
        formatNum(p.views) +
        "</td>" +
        '  <td style="padding: 9px 12px; font-size: 13px; text-align: right; color: #059669; font-weight: 700;">' +
        (p.leads || 0) +
        "</td>" +
        "</tr>"
    )
    .join("");

  // ACQUISITION CHANNELS rows
  const sourceRows = (data.sources || [])
    .map(
      (s) =>
        '<tr style="border-bottom: 1px solid #f1f5f9;">' +
        '  <td style="padding: 9px 12px; font-size: 13px; font-weight: 600; color: #0f172a;">' +
        escapeHtml(s.source) +
        "</td>" +
        '  <td style="padding: 9px 12px; font-size: 13px; text-align: right; color: #475569;">' +
        formatNum(s.visitors) +
        "</td>" +
        '  <td style="padding: 9px 12px; font-size: 13px; font-weight: 700; text-align: right; color: #059669;">' +
        s.leads +
        "</td>" +
        '  <td style="padding: 9px 12px; font-size: 12px; font-weight: 700; text-align: right; color: #6366f1;">' +
        s.convRate +
        "</td>" +
        "</tr>"
    )
    .join("");

  // FORM PERFORMANCE rows (Quick Forms vs Consulting Sessions)
  const formKeys = ["Quick Forms", "Consulting Sessions"];
  if (data.formBreakdown) {
    Object.keys(data.formBreakdown).forEach((fk) => {
      if (formKeys.indexOf(fk) === -1 && data.formBreakdown[fk] > 0) formKeys.push(fk);
    });
  }
  const formRows = formKeys
    .map((fName) => {
      const count = data.formBreakdown && data.formBreakdown[fName] ? data.formBreakdown[fName] : 0;
      return (
        '<tr style="border-bottom: 1px solid #f1f5f9;">' +
        '  <td style="padding: 9px 12px; font-size: 13px; font-weight: 600; color: #0f172a;">' +
        escapeHtml(fName) +
        "</td>" +
        '  <td style="padding: 9px 12px; font-size: 13px; font-weight: 700; text-align: right; color: #059669;">' +
        count +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  // Trend table fallback rows
  let trendTableRows = "";
  if (data.trend && data.trend.labels) {
    trendTableRows = data.trend.labels
      .map(
        (lbl, idx) =>
          '<tr style="border-bottom: 1px solid #f1f5f9;">' +
          '  <td style="padding: 6px 10px; font-size: 11px; color: #475569;">' +
          escapeHtml(lbl) +
          "</td>" +
          '  <td style="padding: 6px 10px; font-size: 11px; font-weight: 700; text-align: right; color: #6366f1;">' +
          (data.trend.visitors[idx] || 0) +
          "</td>" +
          '  <td style="padding: 6px 10px; font-size: 11px; font-weight: 700; text-align: right; color: #059669;">' +
          (data.trend.leads[idx] || 0) +
          "</td>" +
          "</tr>"
      )
      .join("");
  }

  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    "</head>",
    '<body style="font-family: Segoe UI, -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 25px 15px;">',
    '  <div style="max-width: 660px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">',
    '    <div style="background: linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #312e81 100%); padding: 28px 25px; color: #ffffff;">',
    '      <div style="font-size: 11px; font-weight: 800; color: #818cf8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">TRUSTGRID.AI ENTERPRISE ANALYTICS</div>',
    '      <h2 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">' +
      mainHeading +
      "</h2>",
    '      <p style="margin: 6px 0 0 0; font-size: 13px; color: #c7d2fe;">' + subtitle + "</p>",
    "    </div>",
    '    <div style="padding: 24px 22px;">',
    "      <!-- KPIS -->",
    '      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">',
    "        <tr>",
    '          <td width="25%" style="padding: 4px;"><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:10px;font-weight:800;color:#64748b;">VISITORS</div><div style="font-size:18px;font-weight:800;color:#0f172a;margin-top:4px;">' +
      formatNum(k.visitors) +
      "</div></div></td>",
    '          <td width="25%" style="padding: 4px;"><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:10px;font-weight:800;color:#64748b;">SESSIONS</div><div style="font-size:18px;font-weight:800;color:#6366f1;margin-top:4px;">' +
      formatNum(k.sessions) +
      "</div></div></td>",
    '          <td width="25%" style="padding: 4px;"><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:10px;font-weight:800;color:#64748b;">LEADS</div><div style="font-size:18px;font-weight:800;color:#059669;margin-top:4px;">' +
      formatNum(k.leads) +
      "</div></div></td>",
    '          <td width="25%" style="padding: 4px;"><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:10px;font-weight:800;color:#64748b;">CONV. RATE</div><div style="font-size:18px;font-weight:800;color:#7c3aed;margin-top:4px;">' +
      k.conversionRate +
      "</div></div></td>",
    "        </tr>",
    "      </table>",
    "",
    "      <!-- MERGED TREND ANALYSIS (ONE COMBINED GRAPH) -->",
    '      <div style="margin-bottom: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">',
    '        <div style="background: #f8fafc; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">' +
      trendHeading +
      "</div>",
    '        <div style="padding: 14px; text-align: center;">',
    '          <img src="' +
      (data.trend ? data.trend.chartUrl : "") +
      '" alt="Trend Analysis: Visitors / Sessions vs Leads Captured" style="width: 100%; max-width: 580px; height: auto; display: block; margin: 0 auto; border-radius: 6px;" />',
    '          <div style="margin-top: 10px; font-size: 11px; color: #64748b; display: flex; justify-content: center; gap: 16px;">',
    '            <span style="color:#6366f1; font-weight:700;">&mdash; Visitors / Sessions</span>',
    '            <span style="color:#059669; font-weight:700;">&mdash; Leads Captured</span>',
    "          </div>",
    "        </div>",
    '        <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #f1f5f9;">',
    "          <thead>",
    '            <tr style="background:#f8fafc;font-size:10px;color:#64748b;text-transform:uppercase;">',
    '              <th style="padding:6px 10px;text-align:left;">Timeline</th>',
    '              <th style="padding:6px 10px;text-align:right;">Visitors / Sessions</th>',
    '              <th style="padding:6px 10px;text-align:right;">Leads</th>',
    "            </tr>",
    "          </thead>",
    "          <tbody>" +
      (trendTableRows ||
        '<tr><td colspan="3" style="padding:8px;text-align:center;color:#94a3b8;">No trend data</td></tr>') +
      "</tbody>",
    "        </table>",
    "      </div>",
    "",
    "      <!-- TOP ENGAGED PAGES -->",
    '      <div style="margin-bottom: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">',
    '        <div style="background: #f8fafc; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">TOP ENGAGED PAGES</div>',
    '        <table width="100%" cellpadding="0" cellspacing="0">',
    "          <thead>",
    '            <tr style="background:#f1f5f9;font-size:11px;color:#64748b;">',
    '              <th style="padding:6px 12px;text-align:left;">Route</th>',
    '              <th style="padding:6px 12px;text-align:right;">Page Views</th>',
    '              <th style="padding:6px 12px;text-align:right;">Leads</th>',
    "            </tr>",
    "          </thead>",
    "          <tbody>" +
      (pageRows ||
        '<tr><td colspan="3" style="padding:10px;text-align:center;color:#94a3b8;">No data</td></tr>') +
      "</tbody>",
    "        </table>",
    "      </div>",
    "",
    "      <!-- FORM PERFORMANCE -->",
    '      <div style="margin-bottom: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">',
    '        <div style="background: #f8fafc; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">FORM PERFORMANCE</div>',
    '        <table width="100%" cellpadding="0" cellspacing="0">',
    "          <thead>",
    '            <tr style="background:#f1f5f9;font-size:11px;color:#64748b;">',
    '              <th style="padding:6px 12px;text-align:left;">Form Category</th>',
    '              <th style="padding:6px 12px;text-align:right;">Submissions</th>',
    "            </tr>",
    "          </thead>",
    "          <tbody>" +
      (formRows ||
        '<tr><td colspan="2" style="padding:10px;text-align:center;color:#94a3b8;">No submissions</td></tr>') +
      "</tbody>",
    "        </table>",
    "      </div>",
    "",
    "      <!-- ACQUISITION CHANNELS -->",
    '      <div style="margin-bottom: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">',
    '        <div style="background: #f8fafc; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">ACQUISITION CHANNELS</div>',
    '        <table width="100%" cellpadding="0" cellspacing="0">',
    "          <thead>",
    '            <tr style="background:#f1f5f9;font-size:11px;color:#64748b;">',
    '              <th style="padding:6px 12px;text-align:left;">Source</th>',
    '              <th style="padding:6px 12px;text-align:right;">Visitors</th>',
    '              <th style="padding:6px 12px;text-align:right;">Leads</th>',
    '              <th style="padding:6px 12px;text-align:right;">Rate</th>',
    "            </tr>",
    "          </thead>",
    "          <tbody>" +
      (sourceRows ||
        '<tr><td colspan="4" style="padding:10px;text-align:center;color:#94a3b8;">No data</td></tr>') +
      "</tbody>",
    "        </table>",
    "      </div>",
    "",
    '      <div style="text-align:center;margin-top:20px;">',
    '        <a href="' +
      data.dashboardUrl +
      '" target="_blank" style="background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:700;font-size:13px;display:inline-block;">Open Live Master Spreadsheet</a>',
    "      </div>",
    "    </div>",
    '    <div style="background: #f8fafc; padding: 16px 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">',
    "      &copy; " +
      new Date().getFullYear() +
      " TRUSTGRID.AI. Confidential Executive Analytics Report.<br>",
    "      Direct Inquiries: <strong>webadmin.trustgrid.ai@gmail.com</strong>",
    "    </div>",
    "  </div>",
    "</body>",
    "</html>",
  ].join("\n");
}

/**
 * Executes the Weekly Report migration.
 * Preserves exact Apps Script weeklyReport() calculations:
 * w1Start = now - 7 days
 * w1End   = now - 1 day
 * w2Start = w1Start - 7 days
 * w2End   = w1Start - 1 day
 */
export async function runWeeklyReport({ dryRun = false }: { dryRun?: boolean }) {
  const now = new Date();
  const w1Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const w1End = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const w2Start = new Date(w1Start.getTime() - 7 * 24 * 60 * 60 * 1000);
  const w2End = new Date(w1Start.getTime() - 1 * 24 * 60 * 60 * 1000);

  const reportData = await aggregateExecutiveReportData("WEEKLY", w1Start, w1End, w2Start, w2End);
  const emailHtml = buildExecutiveAnalyticsBriefHtml(reportData, "WEEKLY");
  const subject = "[TRUSTGRID.AI] Weekly Analytics Report - " + cleanEmailText(reportData.periodRangeStr);

  if (!dryRun) {
    const recipients = getReportRecipients();
    await sendEmail({
      to: recipients,
      subject,
      html: emailHtml,
    });
  }

  return {
    success: true,
    report: "weekly",
    dryRun,
    period: reportData.periodRangeStr,
    kpis: reportData.kpis,
    comparison: reportData.comparison,
    ...(dryRun ? { html: emailHtml } : {}),
  };
}

/**
 * Executes the Monthly Report migration.
 * Preserves exact Apps Script monthlyReport() calculations:
 * m1Start = now - 30 days
 * m1End   = now - 1 day
 * m2Start = m1Start - 30 days
 * m2End   = m1Start - 1 day
 */
export async function runMonthlyReport({ dryRun = false }: { dryRun?: boolean }) {
  const now = new Date();
  const m1Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const m1End = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const m2Start = new Date(m1Start.getTime() - 30 * 24 * 60 * 60 * 1000);
  const m2End = new Date(m1Start.getTime() - 1 * 24 * 60 * 60 * 1000);

  const reportData = await aggregateExecutiveReportData("MONTHLY", m1Start, m1End, m2Start, m2End);
  const monthLabel = formatDateKolkata(m1End, "MMMM yyyy");
  const emailHtml = buildExecutiveAnalyticsBriefHtml(reportData, "MONTHLY");
  const subject = "[TRUSTGRID.AI] Monthly Analytics Report - " + cleanEmailText(monthLabel);

  if (!dryRun) {
    const recipients = getReportRecipients();
    await sendEmail({
      to: recipients,
      subject,
      html: emailHtml,
    });
  }

  return {
    success: true,
    report: "monthly",
    dryRun,
    month: monthLabel,
    kpis: reportData.kpis,
    comparison: reportData.comparison,
    ...(dryRun ? { html: emailHtml } : {}),
  };
}

/**
 * Executes the Daily Report migration.
 * Preserves exact Apps Script dailyReport() calculations:
 * yesterday = now - 1 day
 * dayBefore = now - 2 days
 */
export async function runDailyReport({ dryRun = false }: { dryRun?: boolean } = {}) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const dayBefore = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const reportData = await aggregateExecutiveReportData("DAILY", yesterday, yesterday, dayBefore, dayBefore);
  const emailHtml = buildExecutiveAnalyticsBriefHtml(reportData, "DAILY");
  const subject = "[TRUSTGRID.AI] Daily Analytics Report - " + cleanEmailText(reportData.periodDateStr);

  if (!dryRun) {
    const recipients = getReportRecipients();
    await sendEmail({
      to: recipients,
      subject,
      html: emailHtml,
    });
  }

  return {
    success: true,
    report: "daily",
    dryRun,
    date: reportData.periodDateStr,
    kpis: reportData.kpis,
    comparison: reportData.comparison,
    ...(dryRun ? { html: emailHtml } : {}),
  };
}
