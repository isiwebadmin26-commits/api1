const base = "https://daily-report-api-tan.vercel.app";
const token = "change-this-secret";

async function testRoute(name: string, url: string, method: string, body?: any) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const dt = Date.now() - t0;
    const txt = await res.text();
    console.log(`[${res.status}] ${name} (${dt}ms) -> ${txt.slice(0, 160)}`);
  } catch (e: any) {
    console.log(`[FAIL] ${name} -> ${e.message}`);
  }
}

async function run() {
  console.log("=== Testing Controller with 3-letter codes ===");
  const codes = ["DRL", "DRT", "DRS", "DPF", "WRT", "WCA", "MRT", "MCA", "CAR"];
  for (const c of codes) {
    await testRoute(`POST /controller { code: "${c}" }`, `${base}/controller`, "POST", { code: c, dryRun: true });
  }

  console.log("\n=== Testing direct URL rewrites ===");
  await testRoute("POST /reports/daily", `${base}/reports/daily`, "POST", { dryRun: true });
  await testRoute("POST /reports/weekly", `${base}/reports/weekly`, "POST", { dryRun: true });
  await testRoute("POST /reports/monthly", `${base}/reports/monthly`, "POST", { dryRun: true });
  await testRoute("POST /reports/career", `${base}/reports/career`, "POST", { dryRun: true });
  await testRoute("POST /reports/daily/leads", `${base}/reports/daily/leads`, "POST", { dryRun: true });
  await testRoute("POST /reports/daily/traffic", `${base}/reports/daily/traffic`, "POST", { dryRun: true });
  await testRoute("POST /reports/daily/stats", `${base}/reports/daily/stats`, "POST", { dryRun: true });
  await testRoute("POST /reports/daily/pending-followup", `${base}/reports/daily/pending-followup`, "POST", { dryRun: true });
  await testRoute("POST /reports/weekly/traffic", `${base}/reports/weekly/traffic`, "POST", { dryRun: true });
  await testRoute("POST /reports/weekly/career-applications", `${base}/reports/weekly/career-applications`, "POST", { dryRun: true });
  await testRoute("POST /reports/monthly/traffic", `${base}/reports/monthly/traffic`, "POST", { dryRun: true });
  await testRoute("POST /reports/monthly/career-applications", `${base}/reports/monthly/career-applications`, "POST", { dryRun: true });
}

run();
