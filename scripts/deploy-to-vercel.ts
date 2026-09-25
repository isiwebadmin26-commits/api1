import fs from "fs";
import path from "path";
import crypto from "crypto";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || "";
const PROJECT_ID = "prj_Q7GhI4URc4gi2rvoUdkhOq1dBevF";
const TEAM_ID = "team_6hn3Vi6fEJwdMHcjyrMLPkR3";
const PROJECT_NAME = "daily-report-api";

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (
        file !== "node_modules" &&
        file !== ".git" &&
        file !== ".vercel" &&
        file !== "scripts"
      ) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (
        !file.startsWith(".env") &&
        !file.endsWith(".log")
      ) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function getSha1(buffer: Buffer): string {
  return crypto.createHash("sha1").update(buffer).digest("hex");
}

async function uploadFile(buffer: Buffer, sha: string) {
  const url = `https://api.vercel.com/v2/files?teamId=${TEAM_ID}`;
  let lastErr: any;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "x-vercel-digest": sha,
          "Content-Length": buffer.length.toString(),
          "Content-Type": "application/octet-stream",
        },
        body: buffer,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed for SHA ${sha}: ${res.status} ${errText}`);
      }
      return;
    } catch (err: any) {
      lastErr = err;
      console.warn(`[Attempt ${attempt}/4] Upload error for ${sha.slice(0, 8)}: ${err.message}. Retrying...`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw lastErr;
}

async function main() {
  console.log("==================================================");
  console.log("🚀 PREPARING DIRECT VERCEL PRODUCTION DEPLOYMENT");
  console.log("==================================================");

  const rootDir = process.cwd();
  const allFiles = getAllFiles(rootDir);
  console.log(`Found ${allFiles.length} files to package.`);

  const filesPayload: Array<{ file: string; sha: string; size: number }> = [];

  for (const filePath of allFiles) {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, "/");
    const content = fs.readFileSync(filePath);
    const sha = getSha1(content);
    const size = content.length;

    console.log(`Uploading: ${relPath} (${size} bytes, sha: ${sha.slice(0, 8)})...`);
    await uploadFile(content, sha);

    filesPayload.push({
      file: relPath,
      sha,
      size,
    });
  }

  console.log("\nAll files uploaded. Creating deployment via Vercel REST API...");

  const deployUrl = `https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}`;
  const deployRes = await fetch(deployUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: PROJECT_NAME,
      project: PROJECT_ID,
      target: "production",
      files: filesPayload,
      projectSettings: {
        nodeVersion: "24.x",
      },
    }),
  });

  const deployData = (await deployRes.json()) as any;
  if (!deployRes.ok) {
    console.error("Deployment request failed:", JSON.stringify(deployData, null, 2));
    process.exit(1);
  }

  const deploymentId = deployData.id || deployData.uid;
  console.log(`\nDeployment created! ID: ${deploymentId}`);
  console.log(`Initial Status: ${deployData.readyState || deployData.status}`);
  console.log(`Preview URL: https://${deployData.url}`);

  // Poll until deployment is READY
  console.log("\nWaiting for Vercel build to complete...");
  let attempts = 0;
  while (attempts < 30) {
    await new Promise((r) => setTimeout(r, 4000));
    attempts++;

    const checkUrl = `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${TEAM_ID}`;
    const checkRes = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });
    const checkData = (await checkRes.json()) as any;
    const state = checkData.readyState || checkData.status;

    console.log(`[${attempts * 4}s] Build state: ${state}`);

    if (state === "READY") {
      console.log("\n==================================================");
      console.log("🎉 VERCEL PRODUCTION DEPLOYMENT IS READY!");
      console.log(`Production URL: https://${deployData.alias?.[0] || "daily-report-api-tan.vercel.app"}`);
      console.log("==================================================");
      return;
    }

    if (state === "ERROR" || state === "CANCELED") {
      console.error("\n❌ Deployment failed with state:", state);
      console.error(JSON.stringify(checkData.error || checkData, null, 2));
      process.exit(1);
    }
  }

  console.log("Timed out waiting for ready state, check Vercel dashboard.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
