/**
 * Cron scheduler for polling AgentMail inbox and processing nurture touchpoints.
 * Runs pollInbox() every 5 minutes and processDueTouchpoints() every 15 minutes.
 *
 * Exports:
 *   startCron()  — start the scheduler (idempotent)
 *   stopCron()   — stop the scheduler
 *   getCronStatus() — current status info
 */

import cron from 'node-cron'
import { pollInbox } from './email-intake'
import { processDueTouchpoints } from './nurture'

let inboxTask: cron.ScheduledTask | null = null
let nurtureTask: cron.ScheduledTask | null = null
let running = false
let lastPollTime: string | null = null
let lastPollResult: { processed: number; errors: number } | null = null
let lastNurtureTime: string | null = null
let lastNurtureResult: { processed: number; errors: number } | null = null
let pollCount = 0
let nurtureCount = 0

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

async function executeNurture(): Promise<void> {
  const start = Date.now()
  console.log(`[${timestamp()}] [cron] Processing nurture touchpoints...`)

  try {
    const result = await processDueTouchpoints()
    const elapsed = Date.now() - start
    lastNurtureTime = timestamp()
    lastNurtureResult = { processed: result.processed, errors: result.errors }
    nurtureCount++

    if (result.processed > 0 || result.errors > 0) {
      console.log(
        `[${lastNurtureTime}] [cron] Nurture #${nurtureCount} complete in ${elapsed}ms — ` +
          `${result.processed} processed, ${result.errors} errors`
      )
    }
  } catch (err) {
    lastNurtureTime = timestamp()
    lastNurtureResult = { processed: 0, errors: 1 }
    nurtureCount++

    console.error(
      `[${lastNurtureTime}] [cron] Nurture #${nurtureCount} failed:`,
      err instanceof Error ? err.message : err
    )
  }
}

/**
 * Start the cron scheduler. Idempotent — calling twice is safe.
 */
export function startCron(): void {
  if (running && inboxTask) {
    console.log(`[${timestamp()}] [cron] Already running, skipping duplicate start`)
    return
  }

  // Schedule: poll inbox every 5 minutes
  inboxTask = cron.schedule('*/5 * * * *', () => {
    executePoll()
  })

  // Schedule: process nurture touchpoints every 15 minutes
  nurtureTask = cron.schedule('*/15 * * * *', () => {
    executeNurture()
  })

  running = true
  console.log(`[${timestamp()}] [cron] Started — inbox every 5 min, nurture every 15 min`)
}

/**
 * Stop the cron scheduler.
 */
export function stopCron(): void {
  if (inboxTask) {
    inboxTask.stop()
    inboxTask = null
  }
  if (nurtureTask) {
    nurtureTask.stop()
    nurtureTask = null
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
    lastNurtureTime,
    lastNurtureResult,
    nurtureCount,
    schedule: '*/5 * * * * (inbox), */15 * * * * (nurture)',
    description: 'Inbox every 5 minutes, nurture every 15 minutes',
  }
}
