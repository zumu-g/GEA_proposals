/**
 * Cron scheduler for polling AgentMail inbox, processing nurture touchpoints,
 * and refreshing the property cache.
 *
 * Schedules:
 *   - Inbox poll: every 5 minutes
 *   - Nurture touchpoints: every 15 minutes
 *   - Daily on-market cache refresh: 6:00 AM AEST (20:00 UTC previous day)
 *   - Weekly sold cache refresh: Monday 5:00 AM AEST (Sunday 19:00 UTC)
 *   - Daily Firecrawl sold refresh: 7:00 AM AEST (21:00 UTC previous day)
 *
 * Exports:
 *   startCron()  — start the scheduler (idempotent)
 *   stopCron()   — stop the scheduler
 *   getCronStatus() — current status info
 */

import cron from 'node-cron'
import { pollInbox } from './email-intake'
import { processDueTouchpoints } from './nurture'
import { runDailyCacheRefresh, runWeeklySoldRefresh, runDailyFirecrawlRefresh } from './cache-refresh'
import { runAgentScrape } from './agent-scraper'
import { runDailyOnMarketScrape } from './onmarket-scraper'
import { runDailyLeasedScrape, runDailyForRentScrape } from './rental-scraper'
import { getDb } from './db'

let inboxTask: cron.ScheduledTask | null = null
let nurtureTask: cron.ScheduledTask | null = null
let dailyCacheTask: cron.ScheduledTask | null = null
let weeklySoldTask: cron.ScheduledTask | null = null
let firecrawlSoldTask: cron.ScheduledTask | null = null
let agentScrapeTask: cron.ScheduledTask | null = null
let onMarketScrapeTask: cron.ScheduledTask | null = null
let leasedScrapeTask: cron.ScheduledTask | null = null
let forRentScrapeTask: cron.ScheduledTask | null = null
let running = false
let lastPollTime: string | null = null
let lastPollResult: { processed: number; errors: number } | null = null
let lastNurtureTime: string | null = null
let lastNurtureResult: { processed: number; errors: number } | null = null
let lastDailyCacheTime: string | null = null
let lastDailyCacheResult: { refreshed: number; errors: number } | null = null
let lastWeeklySoldTime: string | null = null
let lastWeeklySoldResult: { refreshed: number; errors: number } | null = null
let lastFirecrawlSoldTime: string | null = null
let lastFirecrawlSoldResult: { status: string } | null = null
let lastAgentScrapeTime: string | null = null
let lastAgentScrapeResult: { scraped: number; newStored: number } | null = null
let lastOnMarketScrapeTime: string | null = null
let lastOnMarketScrapeResult: { scraped: number; stored: number } | null = null
let lastLeasedScrapeTime: string | null = null
let lastLeasedScrapeResult: { scraped: number; stored: number } | null = null
let lastForRentScrapeTime: string | null = null
let lastForRentScrapeResult: { scraped: number; stored: number } | null = null
let pollCount = 0
let nurtureCount = 0
let dailyCacheCount = 0
let weeklySoldCount = 0
let firecrawlSoldCount = 0
let agentScrapeCount = 0
let onMarketScrapeCount = 0
let leasedScrapeCount = 0
let forRentScrapeCount = 0

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

function hoursAgo(iso: string | null): number {
  if (!iso) return Infinity
  return (Date.now() - new Date(iso).getTime()) / 3600000
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

async function executeDailyCacheRefresh(): Promise<void> {
  const start = Date.now()
  console.log(`[${timestamp()}] [cron] Starting daily on-market cache refresh...`)

  try {
    const result = await runDailyCacheRefresh()
    const elapsed = Date.now() - start
    lastDailyCacheTime = timestamp()
    lastDailyCacheResult = { refreshed: result.refreshed.length, errors: result.errors.length }
    dailyCacheCount++
    saveCronRun('daily-cache', lastDailyCacheResult)

    console.log(
      `[${lastDailyCacheTime}] [cron] Daily cache refresh #${dailyCacheCount} complete in ${elapsed}ms — ` +
        `${result.refreshed.length} suburbs refreshed, ${result.errors.length} errors`
    )
  } catch (err) {
    lastDailyCacheTime = timestamp()
    lastDailyCacheResult = { refreshed: 0, errors: 1 }
    dailyCacheCount++
    saveCronRun('daily-cache', lastDailyCacheResult)

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
    saveCronRun('weekly-sold', lastWeeklySoldResult)

    console.log(
      `[${lastWeeklySoldTime}] [cron] Weekly sold refresh #${weeklySoldCount} complete in ${elapsed}ms — ` +
        `${result.refreshed.length} suburbs refreshed, ${result.errors.length} errors`
    )
  } catch (err) {
    lastWeeklySoldTime = timestamp()
    lastWeeklySoldResult = { refreshed: 0, errors: 1 }
    weeklySoldCount++
    saveCronRun('weekly-sold', lastWeeklySoldResult)

    console.error(
      `[${lastWeeklySoldTime}] [cron] Weekly sold refresh #${weeklySoldCount} failed:`,
      err instanceof Error ? err.message : err
    )
  }
}

async function executeFirecrawlSoldRefresh(): Promise<void> {
  const start = Date.now()
  console.log(`[${timestamp()}] [cron] Running daily Firecrawl sold properties refresh...`)

  try {
    await runDailyFirecrawlRefresh()
    const elapsed = Date.now() - start
    lastFirecrawlSoldTime = timestamp()
    lastFirecrawlSoldResult = { status: 'ok' }
    firecrawlSoldCount++
    saveCronRun('firecrawl-sold', lastFirecrawlSoldResult)

    console.log(
      `[${lastFirecrawlSoldTime}] [cron] Firecrawl sold refresh #${firecrawlSoldCount} complete in ${elapsed}ms`
    )
  } catch (err) {
    lastFirecrawlSoldTime = timestamp()
    lastFirecrawlSoldResult = { status: 'error' }
    firecrawlSoldCount++
    saveCronRun('firecrawl-sold', lastFirecrawlSoldResult)

    console.error(
      `[${lastFirecrawlSoldTime}] [cron] Firecrawl sold refresh #${firecrawlSoldCount} failed:`,
      err instanceof Error ? err.message : err
    )
  }
}

async function executeAgentScrape(): Promise<void> {
  const start = Date.now()
  console.log(`[${timestamp()}] [cron] Running daily agent suburb scrape...`)

  try {
    const result = await runAgentScrape()
    const elapsed = Date.now() - start
    lastAgentScrapeTime = timestamp()
    lastAgentScrapeResult = { scraped: result.totalScraped, newStored: result.newStored }
    agentScrapeCount++
    saveCronRun('agent-scrape', lastAgentScrapeResult)

    console.log(
      `[${lastAgentScrapeTime}] [cron] Agent scrape #${agentScrapeCount} complete in ${elapsed}ms — ` +
        `${result.totalScraped} scraped, ${result.newStored} new, ${result.duplicatesSkipped} dupes`
    )
  } catch (err) {
    lastAgentScrapeTime = timestamp()
    lastAgentScrapeResult = { scraped: 0, newStored: 0 }
    agentScrapeCount++
    saveCronRun('agent-scrape', lastAgentScrapeResult)

    console.error(
      `[${lastAgentScrapeTime}] [cron] Agent scrape #${agentScrapeCount} failed:`,
      err instanceof Error ? err.message : err
    )
  }
}

async function executeOnMarketScrape(): Promise<void> {
  const start = Date.now()
  console.log(`[${timestamp()}] [cron] Running daily on-market listings scrape (Apify)...`)

  try {
    const result = await runDailyOnMarketScrape()
    const elapsed = Date.now() - start
    lastOnMarketScrapeTime = timestamp()
    lastOnMarketScrapeResult = { scraped: result.totalScraped, stored: result.stored }
    onMarketScrapeCount++
    saveCronRun('onmarket', lastOnMarketScrapeResult)

    console.log(
      `[${lastOnMarketScrapeTime}] [cron] On-market scrape #${onMarketScrapeCount} complete in ${elapsed}ms — ` +
        `${result.totalScraped} scraped, ${result.stored} stored`
    )
  } catch (err) {
    lastOnMarketScrapeTime = timestamp()
    lastOnMarketScrapeResult = { scraped: 0, stored: 0 }
    onMarketScrapeCount++
    saveCronRun('onmarket', lastOnMarketScrapeResult)

    console.error(
      `[${lastOnMarketScrapeTime}] [cron] On-market scrape #${onMarketScrapeCount} failed:`,
      err instanceof Error ? err.message : err
    )
  }
}

async function executeLeasedScrape(): Promise<void> {
  const start = Date.now()
  console.log(`[${timestamp()}] [cron] Running daily leased listings scrape (Apify)...`)

  try {
    const result = await runDailyLeasedScrape()
    const elapsed = Date.now() - start
    lastLeasedScrapeTime = timestamp()
    lastLeasedScrapeResult = { scraped: result.totalScraped, stored: result.stored }
    leasedScrapeCount++
    saveCronRun('leased', lastLeasedScrapeResult)

    console.log(
      `[${lastLeasedScrapeTime}] [cron] Leased scrape #${leasedScrapeCount} complete in ${elapsed}ms — ` +
        `${result.totalScraped} scraped, ${result.stored} stored`
    )
  } catch (err) {
    lastLeasedScrapeTime = timestamp()
    lastLeasedScrapeResult = { scraped: 0, stored: 0 }
    leasedScrapeCount++
    saveCronRun('leased', lastLeasedScrapeResult)

    console.error(
      `[${lastLeasedScrapeTime}] [cron] Leased scrape #${leasedScrapeCount} failed:`,
      err instanceof Error ? err.message : err
    )
  }
}

async function executeForRentScrape(): Promise<void> {
  const start = Date.now()
  console.log(`[${timestamp()}] [cron] Running daily for-rent listings scrape (Apify)...`)

  try {
    const result = await runDailyForRentScrape()
    const elapsed = Date.now() - start
    lastForRentScrapeTime = timestamp()
    lastForRentScrapeResult = { scraped: result.totalScraped, stored: result.stored }
    forRentScrapeCount++
    saveCronRun('forrent', lastForRentScrapeResult)

    console.log(
      `[${lastForRentScrapeTime}] [cron] For-rent scrape #${forRentScrapeCount} complete in ${elapsed}ms — ` +
        `${result.totalScraped} scraped, ${result.stored} stored`
    )
  } catch (err) {
    lastForRentScrapeTime = timestamp()
    lastForRentScrapeResult = { scraped: 0, stored: 0 }
    forRentScrapeCount++
    saveCronRun('forrent', lastForRentScrapeResult)

    console.error(
      `[${lastForRentScrapeTime}] [cron] For-rent scrape #${forRentScrapeCount} failed:`,
      err instanceof Error ? err.message : err
    )
  }
}

/**
 * Start the cron scheduler. Idempotent — calling twice is safe.
 * On startup, restores last-run times from SQLite and fires any overdue jobs
 * so a server restart never leaves data stale.
 */
export function startCron(): void {
  if (running && inboxTask) {
    console.log(`[${timestamp()}] [cron] Already running, skipping duplicate start`)
    return
  }

  // Restore last-run history from DB so we survive server restarts
  const history = loadCronHistory()
  if (history['onmarket']) lastOnMarketScrapeTime = history['onmarket'].lastRunAt
  if (history['firecrawl-sold']) lastFirecrawlSoldTime = history['firecrawl-sold'].lastRunAt
  if (history['agent-scrape']) lastAgentScrapeTime = history['agent-scrape'].lastRunAt
  if (history['daily-cache']) lastDailyCacheTime = history['daily-cache'].lastRunAt
  if (history['weekly-sold']) lastWeeklySoldTime = history['weekly-sold'].lastRunAt
  if (history['inbox']) lastPollTime = history['inbox'].lastRunAt
  if (history['nurture']) lastNurtureTime = history['nurture'].lastRunAt
  if (history['leased']) lastLeasedScrapeTime = history['leased'].lastRunAt
  if (history['forrent']) lastForRentScrapeTime = history['forrent'].lastRunAt

  // Catch-up: fire any daily/weekly jobs that were missed while the server was down.
  // Stagger them so they don't all hammer APIs simultaneously.
  const DAILY_THRESHOLD_H = 20  // fire catch-up if job hasn't run in 20h
  const WEEKLY_THRESHOLD_H = 160 // fire catch-up if job hasn't run in ~6.7 days
  let catchUpDelay = 30000 // start 30s after boot

  if (hoursAgo(lastOnMarketScrapeTime) > DAILY_THRESHOLD_H) {
    const d = catchUpDelay
    catchUpDelay += 30000
    console.log(`[cron] On-market scrape overdue (${hoursAgo(lastOnMarketScrapeTime).toFixed(0)}h) — catch-up in ${d / 1000}s`)
    setTimeout(() => executeOnMarketScrape(), d)
  }

  if (hoursAgo(lastFirecrawlSoldTime) > DAILY_THRESHOLD_H) {
    const d = catchUpDelay
    catchUpDelay += 120000 // Firecrawl is slow, give it 2 min before next job
    console.log(`[cron] Firecrawl sold overdue (${hoursAgo(lastFirecrawlSoldTime).toFixed(0)}h) — catch-up in ${d / 1000}s`)
    setTimeout(() => executeFirecrawlSoldRefresh(), d)
  }

  if (hoursAgo(lastAgentScrapeTime) > DAILY_THRESHOLD_H) {
    const d = catchUpDelay
    catchUpDelay += 30000
    console.log(`[cron] Agent scrape overdue (${hoursAgo(lastAgentScrapeTime).toFixed(0)}h) — catch-up in ${d / 1000}s`)
    setTimeout(() => executeAgentScrape(), d)
  }

  if (hoursAgo(lastWeeklySoldTime) > WEEKLY_THRESHOLD_H) {
    const d = catchUpDelay
    catchUpDelay += 30000
    console.log(`[cron] Weekly sold refresh overdue (${hoursAgo(lastWeeklySoldTime).toFixed(0)}h) — catch-up in ${d / 1000}s`)
    setTimeout(() => executeWeeklySoldRefresh(), d)
  }

  if (hoursAgo(lastLeasedScrapeTime) > DAILY_THRESHOLD_H) {
    const d = catchUpDelay
    catchUpDelay += 30000
    console.log(`[cron] Leased scrape overdue (${hoursAgo(lastLeasedScrapeTime).toFixed(0)}h) — catch-up in ${d / 1000}s`)
    setTimeout(() => executeLeasedScrape(), d)
  }

  if (hoursAgo(lastForRentScrapeTime) > DAILY_THRESHOLD_H) {
    const d = catchUpDelay
    catchUpDelay += 30000
    console.log(`[cron] For-rent scrape overdue (${hoursAgo(lastForRentScrapeTime).toFixed(0)}h) — catch-up in ${d / 1000}s`)
    setTimeout(() => executeForRentScrape(), d)
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

  // Schedule: daily Firecrawl sold refresh — 7:00 AM AEST (21:00 UTC previous day)
  firecrawlSoldTask = cron.schedule('0 21 * * *', () => {
    executeFirecrawlSoldRefresh()
  })

  // Schedule: daily agent suburb scrape — 8:00 AM AEST (22:00 UTC previous day)
  agentScrapeTask = cron.schedule('0 22 * * *', () => {
    executeAgentScrape()
  })

  // Schedule: daily on-market scrape via Apify — 9:00 AM AEST (23:00 UTC previous day)
  onMarketScrapeTask = cron.schedule('0 23 * * *', () => {
    executeOnMarketScrape()
  })

  // Schedule: daily leased scrape via Apify — 10:00 AM AEST (0:00 UTC)
  leasedScrapeTask = cron.schedule('0 0 * * *', () => {
    executeLeasedScrape()
  })

  // Schedule: daily for-rent scrape via Apify — 11:00 AM AEST (1:00 UTC)
  forRentScrapeTask = cron.schedule('0 1 * * *', () => {
    executeForRentScrape()
  })

  running = true
  console.log(
    `[${timestamp()}] [cron] Started — inbox every 5 min, nurture every 15 min, ` +
      `on-market cache daily 6am AEST, sold cache weekly Mon 5am AEST, ` +
      `Firecrawl sold daily 7am AEST, agent scrape daily 8am AEST, ` +
      `on-market Apify daily 9am AEST, leased daily 10am AEST, for-rent daily 11am AEST`
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
  if (firecrawlSoldTask) {
    firecrawlSoldTask.stop()
    firecrawlSoldTask = null
  }
  if (agentScrapeTask) {
    agentScrapeTask.stop()
    agentScrapeTask = null
  }
  if (onMarketScrapeTask) {
    onMarketScrapeTask.stop()
    onMarketScrapeTask = null
  }
  if (leasedScrapeTask) {
    leasedScrapeTask.stop()
    leasedScrapeTask = null
  }
  if (forRentScrapeTask) {
    forRentScrapeTask.stop()
    forRentScrapeTask = null
  }
  running = false
  console.log(`[${timestamp()}] [cron] Stopped`)
}

/**
 * Manual triggers — fire a job immediately regardless of schedule.
 * Returns immediately; job runs in background.
 */
export function triggerOnMarketScrape(): void { executeOnMarketScrape() }
export function triggerFirecrawlSoldRefresh(): void { executeFirecrawlSoldRefresh() }
export function triggerAgentScrape(): void { executeAgentScrape() }
export function triggerWeeklySoldRefresh(): void { executeWeeklySoldRefresh() }
export function triggerLeasedScrape(): void { executeLeasedScrape() }
export function triggerForRentScrape(): void { executeForRentScrape() }

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
    lastFirecrawlSoldTime,
    lastFirecrawlSoldResult,
    firecrawlSoldCount,
    lastAgentScrapeTime,
    lastAgentScrapeResult,
    agentScrapeCount,
    lastOnMarketScrapeTime,
    lastOnMarketScrapeResult,
    onMarketScrapeCount,
    lastLeasedScrapeTime,
    lastLeasedScrapeResult,
    leasedScrapeCount,
    lastForRentScrapeTime,
    lastForRentScrapeResult,
    forRentScrapeCount,
    schedule: '*/5 (inbox), */15 (nurture), 6am (cache), Mon 5am (sold), 7am (firecrawl), 8am (agents), 9am (on-market), 10am (leased), 11am (for-rent)',
    description: 'Inbox every 5 min, nurture every 15 min, on-market cache daily 6am AEST, sold cache weekly Mon 5am AEST, Firecrawl sold daily 7am AEST, agent scrape daily 8am AEST, on-market Apify daily 9am AEST, leased daily 10am AEST, for-rent daily 11am AEST',
  }
}
