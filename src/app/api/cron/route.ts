import { NextResponse } from 'next/server'
import { startCron, stopCron, getCronStatus } from '@/lib/cron'

/**
 * GET /api/cron — returns cron status (running, last poll, poll count)
 */
export async function GET() {
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

  return NextResponse.json(
    { error: `Unknown action "${action}". Use "start" or "stop".` },
    { status: 400 }
  )
}
