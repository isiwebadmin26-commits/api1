import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

process.env.EMAIL_TO = "poojasri.aram@gmail.com,bv@trustflow.in";
process.env.CAREER_EMAIL_TO = "poojasri.aram@gmail.com,bv@trustflow.in";

import { runWeeklyReport } from "../lib/analytics-report";

async function main() {
  console.log("Triggering runWeeklyReport({ dryRun: false })...");
  const t0 = Date.now();
  const res = await runWeeklyReport({ dryRun: false });
  console.log(`✅ Weekly Executive Email sent in ${Date.now() - t0}ms:`, res.period);
}

main().catch(console.error);
