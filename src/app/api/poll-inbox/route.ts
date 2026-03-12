import { NextResponse } from 'next/server'
import { pollInbox } from '@/lib/email-intake'

// POST /api/poll-inbox — check AgentMail for new proposal emails
// Can be called manually or by a cron job
export async function POST(request: Request) {
  // Simple auth: check for a secret header to prevent public access
  const authHeader = request.headers.get('x-cron-secret')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await pollInbox()

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      results: result.results,
    })
  } catch (error) {
    console.error('Poll inbox error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to poll inbox' },
      { status: 500 }
    )
  }
}

// GET for easy browser testing during dev
export async function GET() {
  try {
    const result = await pollInbox()
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      results: result.results,
    })
  } catch (error) {
    console.error('Poll inbox error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to poll inbox' },
      { status: 500 }
    )
  }
}
