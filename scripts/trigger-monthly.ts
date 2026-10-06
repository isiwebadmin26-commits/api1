import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

const BASE_URL = process.env.REPORT_API_BASE_URL || "https://daily-report-api-tan.vercel.app";
const TOKEN = process.env.CRON_SECRET || "change-this-secret";

async function main() {
  const force = process.argv.includes("--force");
  console.log("==================================================");
  console.log("🗓️ TRIGGERING MONTHLY EXECUTIVE REPORT (MONTHLY ONCE)");
  console.log(`   Target: ${BASE_URL}/reports/monthly`);
  console.log(`   Force Override: ${force ? "ENABLED" : "DISABLED (Deduplication Active)"}`);
  console.log("==================================================");

  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/reports/monthly`, {
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
        console.log(`\n🟡 [${res.status}] SKIPPED DUPLICATE (${duration}ms)`);
        console.log(`   Notice: ${json.message || "Monthly report already dispatched this month."}`);
      } else {
        console.log(`\n✅ [${res.status}] SUCCESS (${duration}ms)`);
        console.log(`   Email Dispatched: ${json.emailDispatched ?? true}`);
        console.log(`   Period: ${json.period || "Current Month"}`);
      }
    } else {
      console.error(`\n❌ [${res.status}] FAILED (${duration}ms):`, json.error || json.message);
    }
  } catch (err: any) {
    console.error(`\n❌ NETWORK ERROR (${Date.now() - t0}ms):`, err.message);
  }
}

main();
