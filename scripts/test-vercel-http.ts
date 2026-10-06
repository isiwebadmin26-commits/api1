import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

const base = "https://daily-report-api-tan.vercel.app";
const token = process.env.CRON_SECRET || "change-this-secret";

async function testVercelCall() {
  console.log("Triggering 1 report on Vercel API:", `${base}/reports/daily/leads`);
  const t0 = Date.now();
  const res = await fetch(`${base}/reports/daily/leads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dryRun: false }),
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Headers:", Object.fromEntries(res.headers.entries()));
  console.log("Body:", text);
}

testVercelCall();
