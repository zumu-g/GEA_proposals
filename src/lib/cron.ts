/**
 * Cron scheduler — email jobs only.
 *
 * Property data comes live from the everypropertyAI API, so the old scraping
 * and cache-refresh jobs are gone. Two jobs remain:
 *  - inbox:   poll AgentMail for new proposal emails (every 5 min)
 *  - nurture: process due nurture touchpoints (every 15 min)
 */

import cron from 'node-cron'
import { pollInbox } from './email-intake'
import { processDueTouchpoints } from './nurture'
import { getDb } from './db'

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

function saveCronRun(job: string, result: unknown): void {
  try {
    getDb().prepare(`
      INSERT INTO cron_runs (job, last_run_at, last_result)
      VALUES (?, datetime('now'), ?)
      ON CONFLICT(job) DO UPDATE SET last_run_at = excluded.last_run_at, last_result = excluded.last_result
    `).run(job, JSON.stringify(result))
  } catch (err) {
    console.error(`[cron] Failed to persist run state for ${job}:`, err)
  }
}

function loadCronHistory(): Record<string, { lastRunAt: string } | null> {
  try {
    const rows = getDb().prepare('SELECT job, last_run_at FROM cron_runs').all() as Array<{
      job: string; last_run_at: string
    }>
    const history: Record<string, { lastRunAt: string }> = {}
    for (const row of rows) history[row.job] = { lastRunAt: row.last_run_at }
    return history
  } catch {
    return {}
  }
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
    saveCronRun('inbox', lastPollResult)

    console.log(
      `[${lastPollTime}] [cron] Poll #${pollCount} complete in ${elapsed}ms — ` +
        `${result.processed} processed, ${result.errors} errors`
    )
  } catch (err) {
    lastPollTime = timestamp()
    lastPollResult = { processed: 0, errors: 1 }
    pollCount++
    saveCronRun('inbox', lastPollResult)

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
    saveCronRun('nurture', lastNurtureResult)

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
    saveCronRun('nurture', lastNurtureResult)

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

  // Restore last-run history from DB so we survive server restarts
  const history = loadCronHistory()
  if (history['inbox']) lastPollTime = history['inbox'].lastRunAt
  if (history['nurture']) lastNurtureTime = history['nurture'].lastRunAt

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
    schedule: '*/5 (inbox), */15 (nurture)',
    description: 'Inbox every 5 min, nurture every 15 min',
  }
}
