export interface LogContext {
  controllerCode?: string;
  route?: string;
  method?: string;
  ip?: string;
  durationMs?: number;
  statusCode?: number;
  [key: string]: unknown;
}

// Redact any sensitive information such as passwords, tokens, API keys
const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "key",
  "api_key",
  "apikey",
  "private_key",
  "privatekey",
  "credential",
  "credentials",
  "smtp_password",
  "google_private_key",
];

function sanitize(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEYS.some((sk) =>
      k.toLowerCase().includes(sk)
    );
    if (isSensitive) {
      clean[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      clean[k] = sanitize(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export const logger = {
  info(message: string, context?: LogContext) {
    const cleanContext = context ? sanitize(context) : {};
    console.log(
      JSON.stringify({
        level: "INFO",
        timestamp: new Date().toISOString(),
        message,
        ...cleanContext,
      })
    );
  },

  warn(message: string, context?: LogContext) {
    const cleanContext = context ? sanitize(context) : {};
    console.warn(
      JSON.stringify({
        level: "WARN",
        timestamp: new Date().toISOString(),
        message,
        ...cleanContext,
      })
    );
  },

  error(message: string, context?: LogContext & { error?: unknown }) {
    const cleanContext = context ? sanitize(context) : {};
    let errorDetails: string | undefined;

    if (context?.error instanceof Error) {
      errorDetails = context.error.message;
    } else if (typeof context?.error === "string") {
      errorDetails = context.error;
    }

    console.error(
      JSON.stringify({
        level: "ERROR",
        timestamp: new Date().toISOString(),
        message,
        error: errorDetails,
        ...cleanContext,
      })
    );
  },
};
