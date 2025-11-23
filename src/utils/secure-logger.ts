/**
 * Secure Logging Utilities
 * Sanitizes and secures logs to prevent exposure of sensitive information
 */

export interface LogContext {
  [key: string]: any;
}

/**
 * List of sensitive field names that should never be logged
 */
const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "email",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "secretKey",
  "apiSecret",
  "privateKey",
  "creditCard",
  "ssn",
  "socialSecurityNumber",
  "authorization",
]);

/**
 * Recursively sanitizes an object to remove sensitive fields
 */
function sanitizeData(data: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10 || data === null) {
    return data;
  }

  if (typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    // Check if field is sensitive
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      // For sensitive fields, log that they exist but not their value
      sanitized[key] = "[REDACTED]";
      continue;
    }

    // Check for sensitive patterns in key names
    if (
      key.toLowerCase().includes("secret") ||
      key.toLowerCase().includes("token") ||
      key.toLowerCase().includes("password") ||
      key.toLowerCase().includes("key")
    ) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Logs admin actions with sanitized data
 * Safe for authentication and permission-related operations
 */
export function logAdminAction(
  action: string,
  data?: LogContext
): void {
  const isProd = process.env.NODE_ENV === "production";

  const logEntry: Record<string, any> = {
    timestamp: new Date().toISOString(),
    action,
  };

  if (data) {
    const sanitized = sanitizeData(data);
    Object.assign(logEntry, sanitized);
  }

  console.log(`[Admin] ${action}:`, logEntry);
}

/**
 * Logs API requests with sanitized data
 * Safe for tracking API usage and debugging
 */
export function logApiRequest(
  endpoint: string,
  method: string,
  data?: LogContext
): void {
  const logEntry: Record<string, any> = {
    timestamp: new Date().toISOString(),
    endpoint,
    method,
  };

  if (data) {
    const sanitized = sanitizeData(data);
    Object.assign(logEntry, sanitized);
  }

  console.log(`[API ${method}] ${endpoint}:`, logEntry);
}

/**
 * Logs security events (login attempts, access denied, etc.)
 * Includes IP, user agent, and other non-sensitive tracking info
 */
export function logSecurityEvent(
  event: string,
  data?: LogContext
): void {
  const logEntry: Record<string, any> = {
    timestamp: new Date().toISOString(),
    event,
  };

  if (data) {
    const sanitized = sanitizeData(data);
    Object.assign(logEntry, sanitized);
  }

  console.log(`[Security] ${event}:`, logEntry);
}

/**
 * Logs database operations with sanitized data
 * Safe for tracking database changes
 */
export function logDatabaseOperation(
  operation: string,
  table: string,
  data?: LogContext
): void {
  const logEntry: Record<string, any> = {
    timestamp: new Date().toISOString(),
    operation,
    table,
  };

  if (data) {
    const sanitized = sanitizeData(data);
    Object.assign(logEntry, sanitized);
  }

  console.log(`[DB] ${operation} ${table}:`, logEntry);
}

/**
 * Logs file operations with sanitized data
 * Safe for tracking file uploads and deletions
 */
export function logFileOperation(
  operation: string,
  data?: LogContext
): void {
  const logEntry: Record<string, any> = {
    timestamp: new Date().toISOString(),
    operation,
  };

  if (data) {
    const sanitized = sanitizeData(data);
    Object.assign(logEntry, sanitized);
  }

  console.log(`[File] ${operation}:`, logEntry);
}

/**
 * Logs upload attempts with tracking data
 * Safe for monitoring and rate limiting
 */
export function logUploadAttempt(
  success: boolean,
  data?: LogContext
): void {
  const logEntry: Record<string, any> = {
    timestamp: new Date().toISOString(),
    success,
  };

  if (data) {
    const sanitized = sanitizeData(data);
    Object.assign(logEntry, sanitized);
  }

  console.log(`[Upload] ${success ? "SUCCESS" : "FAILED"}:`, logEntry);
}

/**
 * Logs errors with context, sanitizing sensitive information
 */
export function logErrorWithContext(
  context: string,
  error: Error | unknown,
  data?: LogContext
): void {
  const logEntry: Record<string, any> = {
    timestamp: new Date().toISOString(),
    context,
  };

  if (error instanceof Error) {
    logEntry.errorMessage = error.message;
    logEntry.errorType = error.name;
    if (process.env.NODE_ENV !== "production") {
      logEntry.stack = error.stack;
    }
  } else {
    logEntry.error = String(error);
  }

  if (data) {
    const sanitized = sanitizeData(data);
    Object.assign(logEntry, sanitized);
  }

  console.error(`[Error] ${context}:`, logEntry);
}
