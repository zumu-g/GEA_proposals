import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface ActivityRow {
  id: number
  proposal_id: string
  type: string
  description: string | null
  metadata: string | null
  created_at: string
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const proposalId = searchParams.get('proposalId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (proposalId) {
      // Verify proposal exists
      const proposal = db.prepare('SELECT id FROM proposals WHERE id = ?').get(proposalId)
      if (!proposal) {
        return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
      }

      const activities = db.prepare(
        `SELECT id, proposal_id, type, description, metadata, created_at
         FROM activities
         WHERE proposal_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      ).all(proposalId, limit, offset) as ActivityRow[]

      const total = (db.prepare(
        'SELECT COUNT(*) as count FROM activities WHERE proposal_id = ?'
      ).get(proposalId) as { count: number }).count

      return NextResponse.json({ activities, total, limit, offset })
    }

    // All recent activities (across all proposals)
    const activities = db.prepare(
      `SELECT a.id, a.proposal_id, a.type, a.description, a.metadata, a.created_at,
              p.client_name, p.property_address
       FROM activities a
       JOIN proposals p ON a.proposal_id = p.id
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(limit, offset) as (ActivityRow & { client_name: string; property_address: string })[]

    const total = (db.prepare('SELECT COUNT(*) as count FROM activities').get() as { count: number }).count

    return NextResponse.json({ activities, total, limit, offset })
  } catch (error) {
    console.error('Activity GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { proposalId, type, description, metadata } = body as {
      proposalId: string
      type: string
      description?: string
      metadata?: Record<string, unknown>
    }

    if (!proposalId || !type) {
      return NextResponse.json(
        { error: 'proposalId and type are required' },
        { status: 400 }
      )
    }

    const validTypes = ['created', 'sent', 'viewed', 'approved', 'rejected', 'email_sent', 'call_logged', 'note_added']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify proposal exists
    const proposal = db.prepare('SELECT id FROM proposals WHERE id = ?').get(proposalId)
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    const result = db.prepare(
      `INSERT INTO activities (proposal_id, type, description, metadata)
       VALUES (?, ?, ?, ?)`
    ).run(
      proposalId,
      type,
      description || null,
      metadata ? JSON.stringify(metadata) : null
    )

    // Update proposal's updated_at
    db.prepare('UPDATE proposals SET updated_at = datetime("now") WHERE id = ?').run(proposalId)

    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid) as ActivityRow

    return NextResponse.json({ success: true, activity })
  } catch (error) {
    console.error('Activity POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log activity' },
      { status: 500 }
    )
  }
}
