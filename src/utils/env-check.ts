/**
 * Environment Variable Validation
 * Ensures all required environment variables are set at startup
 */

/**
 * Validates that all required environment variables are set
 * Fails fast during startup if any are missing
 */
export function validateRequiredEnv(): void {
  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(", ")}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Validates environment-specific configurations
 */
export function validateEnvironmentConfig(): void {
  const nodeEnv = process.env.NODE_ENV || "development";

  if (nodeEnv === "production") {
    // Production-specific checks
    const productionRequired = ["NEXT_PUBLIC_BASE_URL"];

    const missing = productionRequired.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      console.warn(
        `Production environment variables not fully configured: ${missing.join(", ")}`
      );
    }

    // Check for secure configurations
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      console.warn("NEXT_PUBLIC_SENTRY_DSN not set - error tracking disabled");
    }
  }
}

/**
 * Checks if environment is production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Checks if environment is development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Checks if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return process.env.DEBUG === "true" || !isProduction();
}

/**
 * Gets environment name for logging
 */
export function getEnvironmentName(): string {
  return process.env.NODE_ENV || "development";
}

/**
 * Validates optional environment variables and logs warnings if not set
 */
export function validateOptionalEnv(): void {
  const optional = [
    "SENTRY_DSN",
    "NEXT_PUBLIC_BASE_URL",
    "UPLOAD_API_KEY",
    "DEFAULT_UPLOAD_PROVIDER",
  ];

  const missing = optional.filter((key) => !process.env[key]);

  if (missing.length > 0 && isProduction()) {
    console.warn(
      `Optional environment variables not set: ${missing.join(", ")}`
    );
  }
}

/**
 * Safe environment variable getter that prevents exposure
 * Returns undefined if not set, never throws
 */
export function getEnvVariable(
  key: string,
  defaultValue?: string
): string | undefined {
  const value = process.env[key];

  if (!value && defaultValue !== undefined) {
    return defaultValue;
  }

  return value;
}

/**
 * Gets boolean environment variable
 */
export function getEnvBoolean(key: string, defaultValue = false): boolean {
  const value = process.env[key];

  if (!value) {
    return defaultValue;
  }

  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Gets numeric environment variable
 */
export function getEnvNumber(key: string, defaultValue = 0): number {
  const value = process.env[key];

  if (!value) {
    return defaultValue;
  }

  const num = parseInt(value, 10);

  return isNaN(num) ? defaultValue : num;
}
