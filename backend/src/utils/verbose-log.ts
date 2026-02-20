export function shouldLogVerbose(): boolean {
  return (
    process.env.LOG_LEVEL === 'debug' ||
    process.env.BACKEND_VERBOSE_LOGS === 'true'
  );
}
