import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

// Guarantee destinations
process.env.EMAIL_TO = "poojasri.aram@gmail.com,bv@trustflow.in";
process.env.CAREER_EMAIL_TO = "poojasri.aram@gmail.com,bv@trustflow.in";

import {
  getDailyLeadsService,
  getDailyTrafficService,
  getDailyStatsService,
  getDailyPendingFollowupService,
} from "../lib/daily-service";
import {
  getWeeklyTrafficService,
  getWeeklyCareerApplicationsService,
} from "../lib/weekly-service";
import {
  getMonthlyTrafficService,
  getMonthlyCareerApplicationsService,
} from "../lib/monthly-service";
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry<T>(name: string, fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${maxAttempts}] Executing ${name}...`);
      const res = await fn();
      console.log(`  ✅ ${name} SUCCESS!`);
      return res;
    } catch (err: any) {
      lastErr = err;
      console.warn(`  ⚠️ Attempt ${attempt} failed for ${name}: ${err.message}`);
      if (attempt < maxAttempts) {
        await sleep(2000 * attempt);
      }
    }
  }
  throw lastErr;
}

async function run() {
  console.log("==================================================");
  console.log("📨 SENDING THE 8 MICRO-REPORT AUTOMATION EMAILS");
  console.log("   Destinations: poojasri.aram@gmail.com, bv@trustflow.in");
  console.log("==================================================");

  // 1. Daily Leads
  await retry("1. REPORT_Daily_Leads", async () => {
    const data = await getDailyLeadsService();
    await sendDailyLeadsEmail(data);
  });
  await sleep(1500);

  // 2. Daily Traffic
  await retry("2. REPORT_Daily_Traffic", async () => {
    const data = await getDailyTrafficService();
    await sendDailyTrafficEmail(data);
  });
  await sleep(1500);

  // 3. Daily Stats
  await retry("3. REPORT_Daily_Stats", async () => {
    const data = await getDailyStatsService();
    await sendDailyStatsEmail(data);
  });
  await sleep(1500);

  // 4. Daily Pending Followup
  await retry("4. REPORT_Daily_Pending_Followup", async () => {
    const data = await getDailyPendingFollowupService();
    await sendDailyPendingFollowupEmail(data);
  });
  await sleep(1500);

  // 5. Weekly Traffic
  await retry("5. REPORT_Weekly_Traffic", async () => {
    const data = await getWeeklyTrafficService();
    await sendWeeklyTrafficEmail(data);
  });
  await sleep(1500);

  // 6. Weekly Career Applications
  await retry("6. REPORT_Weekly_Career_Applications", async () => {
    const data = await getWeeklyCareerApplicationsService();
    await sendWeeklyCareerAppsEmail(data);
  });
  await sleep(1500);

  // 7. Monthly Traffic
  await retry("7. REPORT_Monthly_Traffic", async () => {
    const data = await getMonthlyTrafficService();
    await sendMonthlyTrafficEmail(data);
  });
  await sleep(1500);

  // 8. Monthly Career Applications
  await retry("8. REPORT_Monthly_Career_Applications", async () => {
    const data = await getMonthlyCareerApplicationsService();
    await sendMonthlyCareerAppsEmail(data);
  });

  console.log("\n==================================================");
  console.log("🎉 ALL 8 REMAINING AUTOMATION EMAILS DELIVERED!");
  console.log("==================================================");
}

run().catch(console.error);
