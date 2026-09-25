import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors } from "./cors";
import { validateAuth, AuthResult } from "./auth";
import { checkRateLimit, RateLimitResult } from "./rate-limiter";
import { validateMethod, ValidationResult } from "./validator";
import { sendError } from "../lib/response";
import { logger } from "../lib/logger";

export * from "./cors";
export * from "./auth";
export * from "./rate-limiter";
export * from "./validator";

export interface SecurityCheckOptions {
  allowedMethods?: string[];
  requireAuth?: boolean;
}

export interface SecurityCheckResult {
  passed: boolean;
  auth?: AuthResult;
  rateLimit?: RateLimitResult;
}

export function runSecurityMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  options: SecurityCheckOptions = {}
): SecurityCheckResult {
  // 1. CORS Preflight & headers
  const isOptions = handleCors(req, res);
  if (isOptions) {
    return { passed: false };
  }

  // 2. HTTP Method Validation
  const allowedMethods = options.allowedMethods || ["GET", "POST"];
  const methodCheck = validateMethod(req, allowedMethods);
  if (!methodCheck.valid) {
    logger.warn("Method not allowed", {
      method: req.method,
      route: req.url,
    });
    sendError(res, methodCheck.statusCode || 405, methodCheck.error || "Method not allowed", "METHOD_NOT_ALLOWED");
    return { passed: false };
  }

  // 3. Rate Limiting Check
  const rateLimitResult = checkRateLimit(req, res);
  if (!rateLimitResult.allowed) {
    logger.warn("Rate limit exceeded", {
      route: req.url,
      method: req.method,
    });
    sendError(
      res,
      429,
      "Too many requests. Please slow down.",
      "RATE_LIMIT_EXCEEDED"
    );
    return { passed: false, rateLimit: rateLimitResult };
  }

  // 4. Authentication Check
  const requireAuth = options.requireAuth !== false;
  const authResult = validateAuth(req);
  if (requireAuth && !authResult.isAuthenticated) {
    logger.warn("Authentication failed", {
      route: req.url,
      method: req.method,
      reason: authResult.reason,
    });
    sendError(
      res,
      401,
      authResult.reason || "Unauthorized access.",
      "UNAUTHORIZED"
    );
    return { passed: false, auth: authResult, rateLimit: rateLimitResult };
  }

  return {
    passed: true,
    auth: authResult,
    rateLimit: rateLimitResult,
  };
}
