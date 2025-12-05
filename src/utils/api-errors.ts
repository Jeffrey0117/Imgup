/**
 * Secure API Error Handling Utilities
 * Prevents exposure of sensitive information in production environments
 */

/**
 * Formats API errors based on environment
 * - Production: Returns generic error message only
 * - Development: Returns full error details for debugging
 */
export function formatApiError(error: any): {
  error: string;
  details?: string;
} {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    // Production: Return only generic message
    return { error: "Internal Server Error" };
  }

  // Development: Include error details for debugging
  return {
    error: "Internal Server Error",
    details: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Formats database errors to prevent leaking connection details
 */
export function formatDatabaseError(error: any): {
  error: string;
  details?: string;
} {
  const isProd = process.env.NODE_ENV === "production";
  const message = error instanceof Error ? error.message : String(error);

  if (isProd) {
    // Production: Generic message, no details
    if (message.includes("Prisma") || message.includes("Database")) {
      return { error: "Database operation failed" };
    }
    return { error: "Internal Server Error" };
  }

  // Development: Include specific error type
  if (message.includes("Prisma")) {
    return { error: "Database error", details: message };
  }
  if (message.includes("UNIQUE constraint")) {
    return { error: "Duplicate entry", details: "This record already exists" };
  }
  if (message.includes("NOT NULL constraint")) {
    return { error: "Validation error", details: "Required fields are missing" };
  }

  return { error: "Database error", details: message };
}

/**
 * Formats validation errors
 */
export function formatValidationError(message: string): {
  error: string;
} {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    return { error: "Validation failed" };
  }

  return { error: message };
}

/**
 * Safely logs error information without exposing sensitive details
 */
export function logError(
  context: string,
  error: any,
  additionalInfo?: Record<string, any>
): void {
  const isProd = process.env.NODE_ENV === "production";

  const errorData: Record<string, any> = {
    timestamp: new Date().toISOString(),
    context,
  };

  if (error instanceof Error) {
    errorData.message = error.message;
    errorData.name = error.name;
    if (!isProd && error.stack) {
      errorData.stack = error.stack;
    }
  } else {
    errorData.error = String(error);
  }

  // Add additional info (but filter sensitive fields)
  if (additionalInfo) {
    const sanitized = { ...additionalInfo };
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.email;
    delete sanitized.apiKey;
    delete sanitized.secret;
    errorData.info = sanitized;
  }

  console.error(`[${context}]`, errorData);
}

/**
 * Create a consistent error response structure
 */
export function createErrorResponse(
  error: string,
  statusCode: number = 500,
  additionalFields?: Record<string, any>
): {
  error: string;
  [key: string]: any;
} {
  const isProd = process.env.NODE_ENV === "production";

  const response: { error: string; [key: string]: any } = { error };

  // Only add additional fields in development
  if (!isProd && additionalFields) {
    Object.assign(response, additionalFields);
  }

  return response;
}
