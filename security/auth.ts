import type { VercelRequest } from "@vercel/node";

export interface AuthResult {
  isAuthenticated: boolean;
  reason?: string;
  authType?: "bearer" | "api-key" | "query" | "open-mode";
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

  // 3. Check query param apiKey or key
  const queryKey = req.query.apiKey || req.query.key || req.query.token;
  if (queryKey) {
    const keyStr = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    if (configuredSecrets.includes(keyStr.trim())) {
      return { isAuthenticated: true, authType: "query" };
    }
  }

  return {
    isAuthenticated: false,
    reason: "Invalid or missing authentication credentials.",
  };
}
