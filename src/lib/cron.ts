/**
 * Cron scheduler for polling AgentMail inbox.
 * Runs pollInbox() every 5 minutes using node-cron.
 *
 * Exports:
 *   startCron()  — start the scheduler (idempotent)
 *   stopCron()   — stop the scheduler
 *   getCronStatus() — current status info
 */

import cron from 'node-cron'
import { pollInbox } from './email-intake'

let task: cron.ScheduledTask | null = null
let running = false
let lastPollTime: string | null = null
let lastPollResult: { processed: number; errors: number } | null = null
let pollCount = 0

function timestamp(): string {
  return new Date().toISOString()
}

async function executePoll(): Promise<void> {
  const start = Date.now()
  console.log(`[${timestamp()}] [cron] Polling inbox...`)

  try {
    const result = await pollInbox()
    const elapsed = Date.now() - start
    lastPollTime = timestamp()
    lastPollResult = { processed: result.processed, errors: result.errors }
    pollCount++

    console.log(
      `[${lastPollTime}] [cron] Poll #${pollCount} complete in ${elapsed}ms — ` +
        `${result.processed} processed, ${result.errors} errors`
    )
  } catch (err) {
    lastPollTime = timestamp()
    lastPollResult = { processed: 0, errors: 1 }
    pollCount++

    console.error(
      `[${lastPollTime}] [cron] Poll #${pollCount} failed:`,
      err instanceof Error ? err.message : err
    )
  }
}

/**
 * Start the cron scheduler. Idempotent — calling twice is safe.
 */
export function startCron(): void {
  if (running && task) {
    console.log(`[${timestamp()}] [cron] Already running, skipping duplicate start`)
    return
  }

  // Schedule: every 5 minutes
  task = cron.schedule('*/5 * * * *', () => {
    // Fire-and-forget; errors are caught inside executePoll
    executePoll()
  })

  running = true
  console.log(`[${timestamp()}] [cron] Started — polling inbox every 5 minutes`)
}

/**
 * Stop the cron scheduler.
 */
export function stopCron(): void {
  if (task) {
    task.stop()
    task = null
  }
  running = false
  console.log(`[${timestamp()}] [cron] Stopped`)
}

/**
 * Get current cron status.
 */
export function getCronStatus() {
  return {
    running,
    lastPollTime,
    lastPollResult,
    pollCount,
    schedule: '*/5 * * * *',
    description: 'Every 5 minutes',
  }
}
