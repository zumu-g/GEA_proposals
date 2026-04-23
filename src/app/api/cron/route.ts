import { NextResponse } from 'next/server'
import { startCron, stopCron, getCronStatus, triggerOnMarketScrape, triggerFirecrawlSoldRefresh, triggerAgentScrape, triggerWeeklySoldRefresh } from '@/lib/cron'
import { runFullOnMarketScrape } from '@/lib/onmarket-scraper'

/**
 * GET /api/cron — returns cron status (running, last poll, poll count)
 * Auto-starts the cron if it's not running (self-healing after server restarts).
 */
export async function GET() {
  const status = getCronStatus()
  if (!status.running) {
    startCron()
  }
  return NextResponse.json(getCronStatus())
}

/**
 * POST /api/cron — start or stop the cron scheduler
 * Body: { "action": "start" } or { "action": "stop" }
 * Optional header: x-cron-secret (validated against CRON_SECRET env var)
 */
export async function POST(request: Request) {
  // Auth check (optional — only enforced if CRON_SECRET is set)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('x-cron-secret')
    if (authHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body. Expected { "action": "start" | "stop" }' },
      { status: 400 }
    )
  }

  const { action } = body

  if (action === 'start') {
    startCron()
    return NextResponse.json({ success: true, message: 'Cron started', ...getCronStatus() })
  }

  if (action === 'stop') {
    stopCron()
    return NextResponse.json({ success: true, message: 'Cron stopped', ...getCronStatus() })
  }

  // Manual triggers — fire jobs immediately, return 202 (runs in background)
  if (action === 'run-onmarket') {
    triggerOnMarketScrape()
    return NextResponse.json({ success: true, message: "Today's on-market Apify batch started" }, { status: 202 })
  }

  if (action === 'run-onmarket-all') {
    // Full reseed — runs all suburbs. Long-running, fires in background.
    runFullOnMarketScrape().catch(err =>
      console.error('[api/cron] Full on-market reseed failed:', err instanceof Error ? err.message : err)
    )
    return NextResponse.json({ success: true, message: 'Full on-market reseed started (all suburbs, runs in background)' }, { status: 202 })
  }

  if (action === 'run-firecrawl-sold') {
    triggerFirecrawlSoldRefresh()
    return NextResponse.json({ success: true, message: "Today's Firecrawl sold batch started" }, { status: 202 })
  }

  if (action === 'run-agents') {
    triggerAgentScrape()
    return NextResponse.json({ success: true, message: 'Agent scrape started' }, { status: 202 })
  }

  if (action === 'run-weekly-sold') {
    triggerWeeklySoldRefresh()
    return NextResponse.json({ success: true, message: 'Weekly sold refresh started' }, { status: 202 })
  }

  return NextResponse.json(
    { error: `Unknown action "${action}". Use "start", "stop", "run-onmarket", "run-onmarket-all", "run-firecrawl-sold", "run-agents", "run-weekly-sold".` },
    { status: 400 }
  )
}
