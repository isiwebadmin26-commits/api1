import type { VercelRequest } from "@vercel/node";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

export function validateMethod(req: VercelRequest, allowedMethods: string[] = ["GET", "POST"]): ValidationResult {
  if (!req.method || !allowedMethods.includes(req.method.toUpperCase())) {
    return {
      valid: false,
      statusCode: 405,
      error: `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(", ")}.`,
    };
  }
  return { valid: true };
}

export function sanitizeQueryParam(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) return String(val[0]).trim();
  return String(val).trim();
}

export function parseDryRun(req: VercelRequest): boolean {
  const queryVal = sanitizeQueryParam(req.query.dryRun);
  if (queryVal === "true") return true;

  if (req.body && typeof req.body === "object" && req.body.dryRun === true) {
    return true;
  }
  return false;
}

export function parseForce(req: VercelRequest): boolean {
  const queryVal = sanitizeQueryParam(req.query.force);
  if (queryVal === "true") return true;

  if (req.body && typeof req.body === "object" && req.body.force === true) {
    return true;
  }
  return false;
}

export function parseSendEmail(req: VercelRequest, defaultValue = false): boolean {
  const queryVal = sanitizeQueryParam(req.query.sendEmail);
  if (queryVal === "true") return true;
  if (queryVal === "false") return false;

  if (req.body && typeof req.body === "object" && typeof req.body.sendEmail === "boolean") {
    return req.body.sendEmail;
  }
  return defaultValue;
}
