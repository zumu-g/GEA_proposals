/**
 * Cron scheduler for polling AgentMail inbox, processing nurture touchpoints,
 * and refreshing the property cache.
 *
 * Schedules:
 *   - Inbox poll: every 5 minutes
 *   - Nurture touchpoints: every 15 minutes
 *   - Daily on-market cache refresh: 6:00 AM AEST (20:00 UTC previous day)
 *   - Weekly sold cache refresh: Monday 5:00 AM AEST (Sunday 19:00 UTC)
 *
 * Exports:
 *   startCron()  — start the scheduler (idempotent)
 *   stopCron()   — stop the scheduler
 *   getCronStatus() — current status info
 */

import cron from 'node-cron'
import { pollInbox } from './email-intake'
import { processDueTouchpoints } from './nurture'
import { runDailyCacheRefresh, runWeeklySoldRefresh } from './cache-refresh'

let inboxTask: cron.ScheduledTask | null = null
let nurtureTask: cron.ScheduledTask | null = null
let dailyCacheTask: cron.ScheduledTask | null = null
let weeklySoldTask: cron.ScheduledTask | null = null
let running = false
let lastPollTime: string | null = null
let lastPollResult: { processed: number; errors: number } | null = null
let lastNurtureTime: string | null = null
let lastNurtureResult: { processed: number; errors: number } | null = null
let lastDailyCacheTime: string | null = null
let lastDailyCacheResult: { refreshed: number; errors: number } | null = null
let lastWeeklySoldTime: string | null = null
let lastWeeklySoldResult: { refreshed: number; errors: number } | null = null
let pollCount = 0
let nurtureCount = 0
let dailyCacheCount = 0
let weeklySoldCount = 0

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

async function executeDailyCacheRefresh(): Promise<void> {
  const start = Date.now()
  console.log(`[${timestamp()}] [cron] Starting daily on-market cache refresh...`)

  try {
    const result = await runDailyCacheRefresh()
    const elapsed = Date.now() - start
    lastDailyCacheTime = timestamp()
    lastDailyCacheResult = { refreshed: result.refreshed.length, errors: result.errors.length }
    dailyCacheCount++

    console.log(
      `[${lastDailyCacheTime}] [cron] Daily cache refresh #${dailyCacheCount} complete in ${elapsed}ms — ` +
        `${result.refreshed.length} suburbs refreshed, ${result.errors.length} errors`
    )
  } catch (err) {
    lastDailyCacheTime = timestamp()
    lastDailyCacheResult = { refreshed: 0, errors: 1 }
    dailyCacheCount++

    console.error(
      `[${lastDailyCacheTime}] [cron] Daily cache refresh #${dailyCacheCount} failed:`,
      err instanceof Error ? err.message : err
    )
  }
}

async function executeWeeklySoldRefresh(): Promise<void> {
  const start = Date.now()
  console.log(`[${timestamp()}] [cron] Starting weekly sold cache refresh...`)

  try {
    const result = await runWeeklySoldRefresh()
    const elapsed = Date.now() - start
    lastWeeklySoldTime = timestamp()
    lastWeeklySoldResult = { refreshed: result.refreshed.length, errors: result.errors.length }
    weeklySoldCount++

    console.log(
      `[${lastWeeklySoldTime}] [cron] Weekly sold refresh #${weeklySoldCount} complete in ${elapsed}ms — ` +
        `${result.refreshed.length} suburbs refreshed, ${result.errors.length} errors`
    )
  } catch (err) {
    lastWeeklySoldTime = timestamp()
    lastWeeklySoldResult = { refreshed: 0, errors: 1 }
    weeklySoldCount++

    console.error(
      `[${lastWeeklySoldTime}] [cron] Weekly sold refresh #${weeklySoldCount} failed:`,
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

  // Schedule: daily on-market cache refresh at 6:00 AM AEST (20:00 UTC previous day)
  dailyCacheTask = cron.schedule('0 20 * * *', () => {
    executeDailyCacheRefresh()
  })

  // Schedule: weekly sold cache refresh — Monday 5:00 AM AEST (Sunday 19:00 UTC)
  weeklySoldTask = cron.schedule('0 19 * * 0', () => {
    executeWeeklySoldRefresh()
  })

  running = true
  console.log(
    `[${timestamp()}] [cron] Started — inbox every 5 min, nurture every 15 min, ` +
      `on-market cache daily 6am AEST, sold cache weekly Mon 5am AEST`
  )
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
  if (dailyCacheTask) {
    dailyCacheTask.stop()
    dailyCacheTask = null
  }
  if (weeklySoldTask) {
    weeklySoldTask.stop()
    weeklySoldTask = null
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
    lastDailyCacheTime,
    lastDailyCacheResult,
    dailyCacheCount,
    lastWeeklySoldTime,
    lastWeeklySoldResult,
    weeklySoldCount,
    schedule: '*/5 * * * * (inbox), */15 * * * * (nurture), 0 20 * * * (daily cache), 0 19 * * 0 (weekly sold)',
    description: 'Inbox every 5 min, nurture every 15 min, on-market cache daily 6am AEST, sold cache weekly Mon 5am AEST',
  }
}
