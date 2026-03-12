/**
 * Next.js Instrumentation — runs once when the server starts.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Auto-starts the cron scheduler on server boot.
 */
export async function register() {
  // Only run on the server (Node.js runtime), not during build or in Edge
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCron } = await import('./lib/cron')
    startCron()
  }
}
