import type { VercelResponse } from "@vercel/node";

export interface StandardApiResponse<T = unknown> {
  success: boolean;
  status?: string;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  res: VercelResponse,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>
) {
  const payload: StandardApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: VercelResponse,
  statusCode: number,
  message: string,
  errorCode = "REQUEST_FAILED"
) {
  const payload: StandardApiResponse = {
    success: false,
    status: errorCode,
    message,
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(payload);
}

export function sendRawOrWrapped(
  res: VercelResponse,
  result: any,
  statusCode = 200
) {
  // If result already has success boolean, send directly for full backward compatibility
  if (result && typeof result === "object" && "success" in result) {
    return res.status(statusCode).json(result);
  }
  return sendSuccess(res, result, statusCode);
}
