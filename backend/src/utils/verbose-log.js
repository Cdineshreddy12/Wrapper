/**
 * Verbose logging gate. Use for per-request auth/CORS/request-analysis logs
 * that are noisy in development. Set LOG_LEVEL=debug or BACKEND_VERBOSE_LOGS=true
 * to enable.
 */
export function shouldLogVerbose() {
  return (
    process.env.LOG_LEVEL === 'debug' ||
    process.env.BACKEND_VERBOSE_LOGS === 'true'
  );
}
