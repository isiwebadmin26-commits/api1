import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

// Explicitly lock recipients
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function triggerItem(num: number, name: string, fn: () => Promise<any>) {
  console.log(`\n[${num}/12] Triggering ${name}...`);
  const t0 = Date.now();
  try {
    await fn();
    console.log(`  ✅ SUCCESS (${Date.now() - t0}ms) -> Email dispatched to poojasri.aram@gmail.com & bv@trustflow.in`);
  } catch (err: any) {
    console.error(`  ❌ FAILED (${Date.now() - t0}ms):`, err.message);
  }
  await sleep(1500); // 1.5s spacing between email sends
}

async function main() {
  console.log("==================================================");
  console.log("🚀 TRIGGERING ALL 12 AUTOMATIONS & SENDING EMAILS");
  console.log("   • poojasri.aram@gmail.com");
  console.log("   • bv@trustflow.in");
  console.log("==================================================");

  // 1. Daily Executive
  await triggerItem(1, "REPORT_Daily_Executive_Email (DEX)", async () => {
    return executeDailyReportService({ dryRun: false });
  });

  // 2. Weekly Executive
  await triggerItem(2, "REPORT_Weekly_Executive_Email (WEX)", async () => {
    return executeWeeklyReportService({ dryRun: false });
  });

  // 3. Monthly Executive
  await triggerItem(3, "REPORT_Monthly_Executive_Email (MEX)", async () => {
    return executeMonthlyReportService({ dryRun: false });
  });

  // 4. Monthly Career Digest
  await triggerItem(4, "REPORT_Career (CAR)", async () => {
    return executeCareerReportService({ dryRun: false });
  });

  // 5. Daily Leads
  await triggerItem(5, "REPORT_Daily_Leads (DRL)", async () => {
    const data = await getDailyLeadsService();
    return sendDailyLeadsEmail(data);
  });

  // 6. Daily Traffic
  await triggerItem(6, "REPORT_Daily_Traffic (DRT)", async () => {
    const data = await getDailyTrafficService();
    return sendDailyTrafficEmail(data);
  });

  // 7. Daily Stats
  await triggerItem(7, "REPORT_Daily_Stats (DRS)", async () => {
    const data = await getDailyStatsService();
    return sendDailyStatsEmail(data);
  });

  // 8. Daily Pending Followup
  await triggerItem(8, "REPORT_Daily_Pending_Followup (DPF)", async () => {
    const data = await getDailyPendingFollowupService();
    return sendDailyPendingFollowupEmail(data);
  });

  // 9. Weekly Traffic
  await triggerItem(9, "REPORT_Weekly_Traffic (WRT)", async () => {
    const data = await getWeeklyTrafficService();
    return sendWeeklyTrafficEmail(data);
  });

  // 10. Weekly Career Applications
  await triggerItem(10, "REPORT_Weekly_Career_Applications (WCA)", async () => {
    const data = await getWeeklyCareerApplicationsService();
    return sendWeeklyCareerAppsEmail(data);
  });

  // 11. Monthly Traffic
  await triggerItem(11, "REPORT_Monthly_Traffic (MRT)", async () => {
    const data = await getMonthlyTrafficService();
    return sendMonthlyTrafficEmail(data);
  });

  // 12. Monthly Career Applications
  await triggerItem(12, "REPORT_Monthly_Career_Applications (MCA)", async () => {
    const data = await getMonthlyCareerApplicationsService();
    return sendMonthlyCareerAppsEmail(data);
  });

  console.log("\n==================================================");
  console.log("🏁 ALL 12 AUTOMATIONS SUCCESSFULLY TRIGGERED!");
  console.log("   Check inboxes: poojasri.aram@gmail.com, bv@trustflow.in");
  console.log("==================================================");
}

main().catch(console.error);
