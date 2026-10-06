import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

const BASE_URL = process.env.REPORT_API_BASE_URL || "https://daily-report-api-tan.vercel.app";
const TOKEN = process.env.CRON_SECRET || "change-this-secret";

interface ReportJob {
  name: string;
  path: string;
  code: string;
}

const DAILY_2_REPORTS: ReportJob[] = [
  {
    name: "1. Daily Traffic Analysis",
    path: "/reports/daily/traffic",
    code: "DRT",
  },
  {
    name: "2. Daily Leads Summary",
    path: "/reports/daily/leads",
    code: "DRL",
  },
];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function triggerReport(job: ReportJob, force = false) {
  console.log(`\n⏳ Triggering: ${job.name} (${BASE_URL}${job.path})...`);
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${job.path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dryRun: false, force }),
    });

    const duration = Date.now() - t0;
    const json = (await res.json()) as any;

    if (res.ok) {
      if (json.duplicateSkipped) {
        console.log(`  🟡 [${res.status}] SKIPPED DUPLICATE (${duration}ms)`);
        console.log(`     Notice: ${json.message || "Already sent today."}`);
      } else {
        console.log(`  ✅ [${res.status}] SUCCESS (${duration}ms)`);
        console.log(`     Email Dispatched: ${json.emailDispatched ?? true}`);
      }
    } else {
      console.error(`  ❌ [${res.status}] FAILED (${duration}ms):`, json.error || json.message);
    }
  } catch (err: any) {
    console.error(`  ❌ NETWORK ERROR (${Date.now() - t0}ms):`, err.message);
  }
}

async function main() {
  const force = process.argv.includes("--force");
  console.log("==================================================");
  console.log("🚀 TRIGGERING EXACTLY 2 DAILY EMAILS:");
  console.log("   1. Daily Traffic Analysis");
  console.log("   2. Daily Leads Summary");
  console.log(`   Target Host: ${BASE_URL}`);
  console.log(`   Force Override: ${force ? "ENABLED" : "DISABLED (Deduplication Active)"}`);
  console.log("==================================================");

  for (const job of DAILY_2_REPORTS) {
    await triggerReport(job, force);
    await sleep(2000);
  }

  console.log("\n==================================================");
  console.log("🏁 DAILY RUN FINISHED: EXACTLY 2 EMAILS SCHEDULED");
  console.log("==================================================");
}

main();
