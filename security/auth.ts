import type { VercelRequest } from "@vercel/node";

export interface AuthResult {
  isAuthenticated: boolean;
  reason?: string;
  authType?: "bearer" | "api-key" | "query" | "body" | "jira-automation" | "legacy-jira-route" | "open-mode";
}

export function validateAuth(req: VercelRequest): AuthResult {
  const configuredSecrets = [
    process.env.CRON_SECRET,
    process.env.API_SECRET_KEY,
    process.env.REPORT_API_KEY,
    process.env.DAILY_REPORT_SECRET,
    process.env.INTERNAL_API_SECRET,
  ].filter(Boolean) as string[];

  // If no secret key is set in environment, allow requests (open dev mode)
  if (configuredSecrets.length === 0) {
    return {
      isAuthenticated: true,
      authType: "open-mode",
    };
  }

  // 1. Check Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (configuredSecrets.includes(token)) {
      return { isAuthenticated: true, authType: "bearer" };
    }
  }

  // 2. Check x-api-key or X-API-Key header
  const apiKeyHeader =
    (req.headers["x-api-key"] as string) || (req.headers["x-api-token"] as string);
  if (apiKeyHeader && configuredSecrets.includes(apiKeyHeader.trim())) {
    return { isAuthenticated: true, authType: "api-key" };
  }

  // 3. Check query param apiKey or key or token
  const queryKey = req.query.apiKey || req.query.key || req.query.token;
  if (queryKey) {
    const keyStr = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    if (configuredSecrets.includes(keyStr.trim())) {
      return { isAuthenticated: true, authType: "query" };
    }
  }

  // 4. Check body token/secret/apiKey if present
  if (req.body && typeof req.body === "object") {
    const bodyToken = req.body.token || req.body.secret || req.body.apiKey;
    if (typeof bodyToken === "string" && configuredSecrets.includes(bodyToken.trim())) {
      return { isAuthenticated: true, authType: "body" };
    }
  }

  // 5. Check for Atlassian / Jira Automation outgoing webhook triggers
  const userAgent = String(req.headers["user-agent"] || "").toLowerCase();
  const hasAtlassianHeader =
    Boolean(req.headers["x-atlassian-webhook-identifier"]) ||
    Boolean(req.headers["x-atlassian-token"]) ||
    Boolean(req.headers["x-automation-rule-id"]) ||
    userAgent.includes("atlassian") ||
    userAgent.includes("jira");

  if (hasAtlassianHeader) {
    return {
      isAuthenticated: true,
      authType: "jira-automation",
    };
  }

  // 6. Backward Compatibility for Legacy Jira Automation Endpoints
  // Preserves existing Jira Automation triggers (Weekly, Daily, Monthly, Career)
  const candidateUrls: string[] = [
    req.url,
    req.headers["x-matched-path"] as string,
    req.headers["x-forwarded-url"] as string,
  ].filter((u): u is string => typeof u === "string" && u.length > 0);

  const isLegacyJiraEndpoint = candidateUrls.some((u) => {
    const clean = u.split("?")[0].replace(/\/$/, "");
    return (
      clean.endsWith("/reports/weekly") ||
      clean.endsWith("/api/reports/weekly") ||
      clean.endsWith("/reports/daily") ||
      clean.endsWith("/api/reports/daily") ||
      clean.endsWith("/reports/monthly") ||
      clean.endsWith("/api/reports/monthly") ||
      clean.endsWith("/reports/career") ||
      clean.endsWith("/api/reports/career")
    );
  });

  if (isLegacyJiraEndpoint) {
    return {
      isAuthenticated: true,
      authType: "legacy-jira-route",
    };
  }

  return {
    isAuthenticated: false,
    reason: "Invalid or missing authentication credentials.",
  };
}
