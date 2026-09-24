import { google, sheets_v4 } from "googleapis";

export const SHEET_NAME_ALIASES: Record<string, string> = {
  // Contact Form variations
  contactform: "ContactForm",
  contactforms: "ContactForm",
  contact: "ContactForm",
  contacts: "ContactForm",
  contactus: "ContactForm",
  contact_us: "ContactForm",
  contact_form: "ContactForm",
  contactleads: "ContactForm",
  contact_leads: "ContactForm",
  websiteleads: "ContactForm",
  website_leads: "ContactForm",
  leads: "ContactForm",

  // Partner variations
  partnerapps: "PartnerApps",
  partners: "PartnerApps",
  partner: "PartnerApps",
  partner_applications: "PartnerApps",
  partnerapplications: "PartnerApps",
  partnerleads: "PartnerApps",

  // Career variations
  careerapplications: "CareerApplications",
  careers: "CareerApplications",
  career: "CareerApplications",
  careerapps: "CareerApplications",
  jobs: "CareerApplications",
  jobapplications: "CareerApplications",
  applicants: "CareerApplications",

  // Ad campaign
  adcampaign: "AdCampaign",
  ad_campaign: "AdCampaign",
  adcampaignleads: "AdCampaign",
  campaigns: "AdCampaign",
  campaignleads: "AdCampaign",
  adleads: "AdCampaign",

  // Chatbot
  chatbotleads: "ChatbotLeads",
  chatbot: "ChatbotLeads",
  botleads: "ChatbotLeads",
  chatleads: "ChatbotLeads",

  // Sales
  salesinquiries: "SalesInquiries",
  sales: "SalesInquiries",
  salesleads: "SalesInquiries",
  salesinquiry: "SalesInquiries",

  // Academy
  academyinquiries: "AcademyInquiries",
  academy: "AcademyInquiries",
  academy_inquiries: "AcademyInquiries",
  academyleads: "AcademyInquiries",

  // Tender / RFQ
  tenderrfq: "TenderRFQ",
  tenders: "TenderRFQ",
  rfq: "TenderRFQ",
  tender: "TenderRFQ",
  rfqs: "TenderRFQ",

  // Analytics
  trafficanalytics: "TrafficAnalytics",
  traffic: "TrafficAnalytics",
  livetrafficevents: "Live_Traffic_Events",
  pageviews: "Page_Views",
  userbehaviorlibrary: "UserBehaviorLibrary",
  behaviorlibrary: "UserBehaviorLibrary",
  engagementmetrics: "EngagementMetrics",
  behaviormetrics: "BehaviorMetrics",
};

let cachedSheetsClient: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (cachedSheetsClient) return cachedSheetsClient;

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google service account credentials (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY).");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cachedSheetsClient = google.sheets({ version: "v4", auth });
  return cachedSheetsClient;
}

export function getSpreadsheetId(): string {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SPREADSHEET_ID environment variable.");
  }
  return spreadsheetId;
}

export function getSpreadsheetUrl(): string {
  const spreadsheetId = getSpreadsheetId();
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

export interface SheetTabInfo {
  title: string;
  sheetId: number;
}

export async function fetchAllSheetTabs(): Promise<SheetTabInfo[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.sheetId,sheets.properties.title",
  });

  const sheetTabs: SheetTabInfo[] = [];
  if (res.data.sheets) {
    for (const s of res.data.sheets) {
      if (s.properties?.title) {
        sheetTabs.push({
          title: s.properties.title,
          sheetId: s.properties.sheetId ?? 0,
        });
      }
    }
  }

  return sheetTabs;
}

/**
 * Flexible sheet finder faithful to Apps Script findSheetFlexible:
 * 1. Direct exact match
 * 2. Normalized alias match
 * 3. Scan all tabs and compare normalized names
 */
export function findMatchingSheetName(
  requestedName: string,
  availableTabs: SheetTabInfo[]
): SheetTabInfo | null {
  if (!requestedName) return null;

  // 1. Direct exact match
  const exact = availableTabs.find((t) => t.title === requestedName);
  if (exact) return exact;

  // 2. Normalized alias match
  const norm = requestedName.toLowerCase().replace(/[\s\-_]/g, "");
  const canonical = SHEET_NAME_ALIASES[norm] || requestedName;
  const aliasMatch = availableTabs.find((t) => t.title.toLowerCase() === canonical.toLowerCase());
  if (aliasMatch) return aliasMatch;

  // 3. Scan all tabs and compare normalized names
  const canonicalNorm = canonical.toLowerCase().replace(/[\s\-_]/g, "");
  const fuzzy = availableTabs.find((t) => {
    const curNorm = t.title.toLowerCase().replace(/[\s\-_]/g, "");
    return curNorm === norm || curNorm === canonicalNorm;
  });

  return fuzzy || null;
}

/**
 * Reads all rows from a given sheet tab.
 */
export async function readSheetValues(sheetName: string): Promise<any[][]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A:ZZ`,
    });
    return response.data.values ?? [];
  } catch (err: any) {
    console.warn(`Failed to read sheet ${sheetName}: ${err.message}`);
    return [];
  }
}
