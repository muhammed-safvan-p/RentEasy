/**
 * Production-safe logger utility.
 * Suppresses debug/error console spam in production environments
 * while preserving developer console visibility in development.
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.error(...args);
    }
  },
};
