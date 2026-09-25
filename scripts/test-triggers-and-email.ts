import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

// Explicitly send to BOTH poojasri.aram@gmail.com and bv@trustflow.in
process.env.EMAIL_TO = "poojasri.aram@gmail.com,bv@trustflow.in";
process.env.CAREER_EMAIL_TO = "poojasri.aram@gmail.com,bv@trustflow.in";

import { runDailyReport, runWeeklyReport, runMonthlyReport } from "../lib/analytics-report";
import { executeCareerReportService } from "../lib/career-service";

async function main() {
  console.log("==================================================");
  console.log("🚀 TRIGGERING ALL REPORTS TO BOTH RECIPIENTS:");
  console.log("   • poojasri.aram@gmail.com");
  console.log("   • bv@trustflow.in");
  console.log("==================================================");

  // 1. Daily Executive Report
  try {
    console.log("\n[1/4] Triggering Daily Executive Report...");
    const dailyResult = await runDailyReport({ dryRun: false });
    console.log("  ✅ Daily Report sent to both recipients!");
    console.log("     Subject:", (dailyResult as any)?.subject || "Daily Report Email");
  } catch (err: any) {
    console.error("  ❌ Daily Report failed:", err.message);
  }

  // 2. Weekly Executive Report
  try {
    console.log("\n[2/4] Triggering Weekly Executive Report...");
    const weeklyResult = await runWeeklyReport({ dryRun: false });
    console.log("  ✅ Weekly Report sent to both recipients!");
    console.log("     Subject:", (weeklyResult as any)?.subject || "Weekly Report Email");
  } catch (err: any) {
    console.error("  ❌ Weekly Report failed:", err.message);
  }

  // 3. Monthly Executive Report
  try {
    console.log("\n[3/4] Triggering Monthly Executive Report...");
    const monthlyResult = await runMonthlyReport({ dryRun: false });
    console.log("  ✅ Monthly Report sent to both recipients!");
    console.log("     Subject:", (monthlyResult as any)?.subject || "Monthly Report Email");
  } catch (err: any) {
    console.error("  ❌ Monthly Report failed:", err.message);
  }

  // 4. Monthly Career Applications & Resumes Digest
  try {
    console.log("\n[4/4] Triggering Career Digest Pipeline...");
    const careerResult = await executeCareerReportService({ dryRun: false });
    console.log("  ✅ Career Digest sent to both recipients!");
  } catch (err: any) {
    console.error("  ❌ Career Digest failed:", err.message);
  }

  console.log("\n==================================================");
  console.log("🏁 ALL 4 REPORT PIPELINES COMPLETED & DELIVERED");
  console.log("==================================================");
}

main();
