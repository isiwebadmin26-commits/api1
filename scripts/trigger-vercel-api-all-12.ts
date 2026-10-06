import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

const BASE_URL = "https://daily-report-api-tan.vercel.app";
const TOKEN = process.env.CRON_SECRET || "change-this-secret";

interface TriggerConfig {
  name: string;
  path: string;
  code: string;
}

const REPORTS: TriggerConfig[] = [
  { name: "REPORT_Daily_Executive_Email", path: "/reports/daily", code: "DEX" },
  { name: "REPORT_Weekly_Executive_Email", path: "/reports/weekly", code: "WEX" },
  { name: "REPORT_Monthly_Executive_Email", path: "/reports/monthly", code: "MEX" },
  { name: "REPORT_Career", path: "/reports/career", code: "CAR" },
  { name: "REPORT_Daily_Leads", path: "/reports/daily/leads", code: "DRL" },
  { name: "REPORT_Daily_Traffic", path: "/reports/daily/traffic", code: "DRT" },
  { name: "REPORT_Daily_Stats", path: "/reports/daily/stats", code: "DRS" },
  { name: "REPORT_Daily_Pending_Followup", path: "/reports/daily/pending-followup", code: "DPF" },
  { name: "REPORT_Weekly_Traffic", path: "/reports/weekly/traffic", code: "WRT" },
  { name: "REPORT_Weekly_Career_Applications", path: "/reports/weekly/career-applications", code: "WCA" },
  { name: "REPORT_Monthly_Traffic", path: "/reports/monthly/traffic", code: "MRT" },
  { name: "REPORT_Monthly_Career_Applications", path: "/reports/monthly/career-applications", code: "MCA" },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function triggerVercelReport(index: number, report: TriggerConfig) {
  console.log(`\n[${index}/${REPORTS.length}] Triggering via VERCEL API: ${report.name} (${BASE_URL}${report.path})...`);
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${report.path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dryRun: false }),
    });

    const text = await res.text();
    const duration = Date.now() - t0;

    if (res.ok) {
      console.log(`  ✅ [${res.status}] SUCCESS (${duration}ms)`);
      try {
        const json = JSON.parse(text);
        console.log(`     Response:`, JSON.stringify({
          success: json.success,
          report: json.report,
          emailDispatched: json.emailDispatched ?? json.emailSent ?? true,
        }));
      } catch {
        console.log(`     Response: ${text.slice(0, 100)}`);
      }
    } else {
      console.error(`  ❌ [${res.status}] FAILED (${duration}ms): ${text.slice(0, 200)}`);
    }
  } catch (err: any) {
    console.error(`  ❌ NETWORK ERROR (${Date.now() - t0}ms):`, err.message);
  }
}

async function main() {
  console.log("==================================================");
  console.log(`🌐 TRIGGERING ALL 12 REPORTS VIA VERCEL LIVE API:`);
  console.log(`   Host: ${BASE_URL}`);
  console.log(`   Recipients: poojasri.aram@gmail.com, bv@trustflow.in`);
  console.log("==================================================");

  for (let i = 0; i < REPORTS.length; i++) {
    await triggerVercelReport(i + 1, REPORTS[i]);
    await sleep(2000); // 2 second pause between triggers
  }

  console.log("\n==================================================");
  console.log("🏁 ALL 12 VERCEL API ENDPOINTS TRIGGERED");
  console.log("==================================================");
}

main();
