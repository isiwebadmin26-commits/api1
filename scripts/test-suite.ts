import type { VercelRequest, VercelResponse } from "@vercel/node";
import healthHandler from "../api/health";
import securityHandler from "../api/security";
import controllerHandler from "../api/controller";
import { validateAuth } from "../security/auth";
import { checkRateLimit } from "../security/rate-limiter";
import { validateMethod } from "../security/validator";
import { logger } from "../lib/logger";

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  ended: boolean;
}

function createMockReq(overrides: Partial<VercelRequest> = {}): VercelRequest {
  const token = process.env.CRON_SECRET || process.env.API_SECRET_KEY || "test_secret_token";
  return {
    method: "POST",
    url: "/controller",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    query: {},
    body: {},
    socket: { remoteAddress: "127.0.0.1" } as any,
    ...overrides,
  } as unknown as VercelRequest;
}

function createMockRes(): { res: VercelResponse; mock: MockResponse } {
  const mock: MockResponse = {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
  };

  const res = {
    status(code: number) {
      mock.statusCode = code;
      return res;
    },
    setHeader(name: string, value: string) {
      mock.headers[name] = value;
      return res;
    },
    json(data: any) {
      mock.body = data;
      mock.ended = true;
      return res;
    },
    end() {
      mock.ended = true;
      return res;
    },
  } as unknown as VercelResponse;

  return { res, mock };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`, detail || "");
    failed++;
  }
}

async function runAllTests() {
  console.log("==================================================");
  console.log("🚀 STARTING JIRA CONTROLLER & ARCHITECTURE TEST SUITE");
  console.log("==================================================\n");

  const validToken = process.env.CRON_SECRET || process.env.API_SECRET_KEY || "test_secret_token";
  if (!process.env.CRON_SECRET && !process.env.API_SECRET_KEY) {
    process.env.CRON_SECRET = validToken;
  }

  // 1. Health Endpoint Test
  console.log("--- 1. Health Check Endpoint (/health) ---");
  {
    const req = createMockReq({ method: "GET", url: "/health", headers: {} });
    const { res, mock } = createMockRes();
    await healthHandler(req, res);
    assert(mock.statusCode === 200, "Health returns 200 OK");
    assert(mock.body?.status === "ok", "Health body status is 'ok'");
    assert(mock.body?.service === "daily-report-api", "Health body identifies service");
  }

  // 2. Security Endpoint Test
  console.log("\n--- 2. Security Diagnostic Endpoint (/security) ---");
  {
    const req = createMockReq({ method: "GET", url: "/security" });
    const { res, mock } = createMockRes();
    await securityHandler(req, res);
    assert(mock.statusCode === 200, "Security endpoint returns 200 OK");
    assert(mock.body?.data?.status === "SECURE", "Security reports status SECURE");
    assert(mock.body?.data?.rateLimitStatus !== undefined, "Security reports rate limit metrics");
  }

  // 3. Controller 3-Letter Code Validation & Routing Tests
  console.log("\n--- 3. Jira Controller 3-Letter Code Validation (/controller) ---");
  {
    // Test: Unauthenticated request rejected
    const reqNoAuth = createMockReq({ method: "POST", url: "/controller", headers: {}, body: { code: "DRL" } });
    const { res: resNoAuth, mock: mockNoAuth } = createMockRes();
    await controllerHandler(reqNoAuth, resNoAuth);
    assert(mockNoAuth.statusCode === 401, "Controller rejects unauthenticated Jira request with 401");

    // Test: Missing code returns manifest
    const reqManifest = createMockReq({ method: "GET", url: "/controller", body: {} });
    const { res: resM, mock: mockM } = createMockRes();
    await controllerHandler(reqManifest, resM);
    assert(mockM.statusCode === 200, "Controller without code returns 3-letter codes manifest");
    assert(Array.isArray(mockM.body?.data?.availableCodes), "Manifest contains availableCodes array");

    // Test: 2-character code rejected
    const req2Char = createMockReq({ method: "POST", url: "/controller", body: { code: "DR" } });
    const { res: res2, mock: mock2 } = createMockRes();
    await controllerHandler(req2Char, res2);
    assert(mock2.statusCode === 400, "2-character code 'DR' is rejected with 400");
    assert(mock2.body?.status === "INVALID_CODE_FORMAT", "Status is INVALID_CODE_FORMAT for 2-char code");

    // Test: 4-character code rejected
    const req4Char = createMockReq({ method: "POST", url: "/controller", body: { code: "DRLS" } });
    const { res: res4, mock: mock4 } = createMockRes();
    await controllerHandler(req4Char, res4);
    assert(mock4.statusCode === 400, "4-character code 'DRLS' is rejected with 400");
    assert(mock4.body?.status === "INVALID_CODE_FORMAT", "Status is INVALID_CODE_FORMAT for 4-char code");

    // Test: Long/invalid string rejected
    const reqLong = createMockReq({ method: "POST", url: "/controller", body: { code: "INVALID" } });
    const { res: resL, mock: mockL } = createMockRes();
    await controllerHandler(reqLong, resL);
    assert(mockL.statusCode === 400, "Long code 'INVALID' is rejected with 400");

    // Test: Unknown 3-letter code rejected
    const reqUnknown = createMockReq({ method: "POST", url: "/controller", body: { code: "XYZ" } });
    const { res: resU, mock: mockU } = createMockRes();
    await controllerHandler(reqUnknown, resU);
    assert(mockU.statusCode === 400, "Unknown 3-letter code 'XYZ' is rejected with 400");
    assert(mockU.body?.status === "UNKNOWN_CONTROLLER_CODE", "Status is UNKNOWN_CONTROLLER_CODE");
  }

  // 4. Test All Canonical 3-Letter Codes Existence in Controller
  console.log("\n--- 4. Canonical 3-Letter Code Verification ---");
  {
    const { API_ROUTES } = await import("../controller");
    const requiredCodes = ["DRL", "DRT", "DRS", "WRT", "WCA", "MRT", "MCA", "CAR"];

    for (const code of requiredCodes) {
      const route = API_ROUTES[code];
      assert(Boolean(route), `Code '${code}' is registered in controller`);
      assert(typeof route?.handler === "function", `Code '${code}' has an attached handler function`);
      assert(typeof route?.service === "string", `Code '${code}' maps to service '${route?.service}'`);
    }
  }

  // 5. Security Subsystem (Auth, Rate Limiting, Validation)
  console.log("\n--- 5. Security Subsystem (Auth, Rate Limiting, Validation) ---");
  {
    // Validator: disallowed method
    const reqBadMethod = createMockReq({ method: "DELETE" });
    const methodRes = validateMethod(reqBadMethod, ["GET", "POST"]);
    assert(!methodRes.valid && methodRes.statusCode === 405, "Disallowed HTTP method returns 405");

    // Rate Limiter
    const reqRl = createMockReq({ headers: { "x-forwarded-for": "10.0.0.1" } });
    const rlRes = checkRateLimit(reqRl);
    assert(rlRes.allowed === true, "First request within rate limit is allowed");
    assert(rlRes.remaining >= 0, "Rate limiter tracks remaining calls");

    // Auth validation
    const reqAuthBearer = createMockReq({ headers: { authorization: "Bearer wrong_secret" } });
    const authFail = validateAuth(reqAuthBearer);
    assert(authFail.isAuthenticated === false, "Invalid Bearer token fails authentication");

    const reqAuthPass = createMockReq({ headers: { authorization: `Bearer ${validToken}` } });
    const authPass = validateAuth(reqAuthPass);
    assert(authPass.isAuthenticated === true, "Valid Bearer token succeeds authentication");
  }

  // 6. Backward Compatibility for Jira Legacy Routes
  console.log("\n--- 6. Backward Compatibility (Existing Jira Automation Endpoints) ---");
  {
    const compatDaily = await import("../api/reports/daily");
    const compatWeekly = await import("../api/reports/weekly");
    const compatMonthly = await import("../api/reports/monthly");
    const compatCareer = await import("../api/reports/career");

    assert(typeof compatDaily.default === "function", "/api/reports/daily handler is exported");
    assert(typeof compatWeekly.default === "function", "/api/reports/weekly handler is exported");
    assert(typeof compatMonthly.default === "function", "/api/reports/monthly handler is exported");
    assert(typeof compatCareer.default === "function", "/api/reports/career handler is exported");
  }

  // 7. Structured Logger Masking
  console.log("\n--- 7. Structured Logger & Security Redaction ---");
  {
    let loggedData = "";
    const originalLog = console.log;
    console.log = (msg: string) => { loggedData = msg; };
    logger.info("Test event", {
      route: "/test",
      password: "secret_password_123",
      api_key: "api_key_456",
      normalField: "visible_value",
    });
    console.log = originalLog;

    const parsed = JSON.parse(loggedData);
    assert(parsed.password === "[REDACTED]", "Password field is redacted in logs");
    assert(parsed.api_key === "[REDACTED]", "API key field is redacted in logs");
    assert(parsed.normalField === "visible_value", "Non-sensitive field is preserved in logs");
  }

  console.log("\n==================================================");
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
