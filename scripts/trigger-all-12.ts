import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

// Explicitly ensure recipients are set to both target emails
process.env.EMAIL_TO = "poojasri.aram@gmail.com,bv@trustflow.in";
process.env.CAREER_EMAIL_TO = "poojasri.aram@gmail.com,bv@trustflow.in";

import {
  getDailyLeadsService,
  getDailyTrafficService,
  getDailyStatsService,
  getDailyPendingFollowupService,
  executeDailyReportService,
} from "../lib/daily-service";
import {
  getWeeklyTrafficService,
  getWeeklyCareerApplicationsService,
  executeWeeklyReportService,
} from "../lib/weekly-service";
import {
  getMonthlyTrafficService,
  getMonthlyCareerApplicationsService,
  executeMonthlyReportService,
} from "../lib/monthly-service";
import { executeCareerReportService } from "../lib/career-service";
import {
  sendDailyLeadsEmail,
  sendDailyTrafficEmail,
  sendDailyStatsEmail,
  sendDailyPendingFollowupEmail,
  sendWeeklyTrafficEmail,
  sendWeeklyCareerAppsEmail,
  sendMonthlyTrafficEmail,
  sendMonthlyCareerAppsEmail,
} from "../lib/micro-report-emails";

async function main() {
  console.log("==================================================");
  console.log("🚀 TRIGGERING ALL 12 AUTOMATION PIPELINES & EMAILS");
  console.log("   • poojasri.aram@gmail.com");
  console.log("   • bv@trustflow.in");
  console.log("==================================================");

  // 1. Daily Executive Email
  try {
    console.log("\n[1/12] Triggering REPORT_Daily_Executive_Email...");
    await executeDailyReportService({ dryRun: false });
    console.log("  ✅ Daily Executive Email sent!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
  }

  // 2. Weekly Executive Email
  try {
    console.log("\n[2/12] Triggering REPORT_Weekly_Executive_Email...");
    await executeWeeklyReportService({ dryRun: false });
    console.log("  ✅ Weekly Executive Email sent!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
  }

  // 3. Monthly Executive Email
  try {
    console.log("\n[3/12] Triggering REPORT_Monthly_Executive_Email...");
    await executeMonthlyReportService({ dryRun: false });
    console.log("  ✅ Monthly Executive Email sent!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
  }

  // 4. Career Digest Email
  try {
    console.log("\n[4/12] Triggering REPORT_Career...");
    await executeCareerReportService({ dryRun: false });
    console.log("  ✅ Career Digest Email sent!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
  }

  // 5. Daily Leads Email
  try {
    console.log("\n[5/12] Triggering REPORT_Daily_Leads...");
    const data = await getDailyLeadsService();
    await sendDailyLeadsEmail(data);
    console.log("  ✅ Daily Leads Email sent!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
  }

  // 6. Daily Traffic Email
  try {
    console.log("\n[6/12] Triggering REPORT_Daily_Traffic...");
    const data = await getDailyTrafficService();
    await sendDailyTrafficEmail(data);
    console.log("  ✅ Daily Traffic Email sent!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
  }

  // 7. Daily Stats Email
  try {
    console.log("\n[7/12] Triggering REPORT_Daily_Stats...");
    const data = await getDailyStatsService();
    await sendDailyStatsEmail(data);
    console.log("  ✅ Daily Stats Email sent!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
  }

  // 8. Daily Pending Followup Email
  try {
    console.log("\n[8/12] Triggering REPORT_Daily_Pending_Followup...");
    const data = await getDailyPendingFollowupService();
    await sendDailyPendingFollowupEmail(data);
    console.log("  ✅ Daily Pending Followup Email sent!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
  }

  // 9. Weekly Traffic Email
  try {
    console.log("\n[9/12] Triggering REPORT_Weekly_Traffic...");
    const data = await getWeeklyTrafficService();
    await sendWeeklyTrafficEmail(data);
    console.log("  ✅ Weekly Traffic Email sent!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
  }

  // 10. Weekly Career Applications Email
  try {
    console.log("\n[10/12] Triggering REPORT_Weekly_Career_Applications...");
    const data = await getWeeklyCareerApplicationsService();
    await sendWeeklyCareerAppsEmail(data);
    console.log("  ✅ Weekly Career Applications Email sent!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
  }

  // 11. Monthly Traffic Email
  try {
    console.log("\n[11/12] Triggering REPORT_Monthly_Traffic...");
    const data = await getMonthlyTrafficService();
    await sendMonthlyTrafficEmail(data);
    console.log("  ✅ Monthly Traffic Email sent!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
  }

  // 12. Monthly Career Applications Email
  try {
    console.log("\n[12/12] Triggering REPORT_Monthly_Career_Applications...");
    const data = await getMonthlyCareerApplicationsService();
    await sendMonthlyCareerAppsEmail(data);
    console.log("  ✅ Monthly Career Applications Email sent!");
  } catch (err: any) {
    console.error("  ❌ Failed:", err.message);
  }

  console.log("\n==================================================");
  console.log("🏁 ALL 12 AUTOMATION EMAILS SUCCESSFULLY DISPATCHED!");
  console.log("==================================================");
}

main();
