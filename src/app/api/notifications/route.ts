import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type Database from 'better-sqlite3'

export interface Notification {
  key: string
  type: 'call_due' | 'needs_followup' | 'stale' | 'new_proposal' | 'viewed' | 'approved'
  title: string
  description: string
  proposalId: string
  propertyAddress: string
  clientName: string
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  read: boolean
}

function buildNotifications(db: Database.Database): { notifications: Notification[]; unreadCount: number } {
  // Get dismissed and read notification keys
  const dismissed = new Set(
    (db.prepare('SELECT notification_key FROM notification_dismissals').all() as { notification_key: string }[])
      .map(r => r.notification_key)
  )
  const readKeys = new Set(
    (db.prepare('SELECT notification_key FROM notification_reads').all() as { notification_key: string }[])
      .map(r => r.notification_key)
  )

  const notifications: Notification[] = []

  // 1. Overdue nurture touchpoints -- any pending touchpoints (call/email/sms) scheduled for today or overdue
  const nurtureDue = db.prepare(`
    SELECT nt.id as touchpoint_id, nt.type as touchpoint_type, nt.scheduled_for, nt.subject,
           np.proposal_id, p.client_name, p.property_address
    FROM nurture_touchpoints nt
    JOIN nurture_plans np ON nt.plan_id = np.id
    JOIN proposals p ON np.proposal_id = p.id
    WHERE nt.status = 'pending'
      AND nt.scheduled_for <= datetime('now', '+1 day')
    ORDER BY nt.scheduled_for ASC
  `).all() as { touchpoint_id: number; touchpoint_type: string; scheduled_for: string; subject: string | null; proposal_id: string; client_name: string; property_address: string }[]

  for (const tp of nurtureDue) {
    const key = `nurture_due:${tp.proposal_id}:${tp.touchpoint_id}`
    if (dismissed.has(key)) continue
    const isOverdue = new Date(tp.scheduled_for) < new Date()
    const typeLabel = tp.touchpoint_type === 'call' ? 'call' : tp.touchpoint_type === 'sms' ? 'sms' : 'email'
    notifications.push({
      key,
      type: 'call_due',
      title: isOverdue ? `${typeLabel} overdue` : `${typeLabel} due today`,
      description: tp.subject || `Follow-up ${typeLabel} with ${tp.client_name}`,
      proposalId: tp.proposal_id,
      propertyAddress: tp.property_address,
      clientName: tp.client_name,
      priority: isOverdue ? 'high' : 'medium',
      createdAt: tp.scheduled_for,
      read: readKeys.has(key),
    })
  }

  // 2. Stale proposals -- sent but no activity in 3+ days
  const staleProposals = db.prepare(`
    SELECT p.id, p.client_name, p.property_address, p.sent_at, p.updated_at
    FROM proposals p
    WHERE p.status = 'sent'
      AND p.sent_at IS NOT NULL
      AND julianday('now') - julianday(p.sent_at) >= 3
      AND NOT EXISTS (
        SELECT 1 FROM activities a
        WHERE a.proposal_id = p.id
          AND julianday('now') - julianday(a.created_at) < 1
      )
    ORDER BY p.sent_at ASC
  `).all() as { id: string; client_name: string; property_address: string; sent_at: string; updated_at: string }[]

  for (const p of staleProposals) {
    const key = `stale:${p.id}`
    if (dismissed.has(key)) continue
    const daysSinceSent = Math.floor((Date.now() - new Date(p.sent_at).getTime()) / 86400000)
    notifications.push({
      key,
      type: 'needs_followup',
      title: 'needs follow-up',
      description: `Sent ${daysSinceSent} days ago, no response from ${p.client_name}`,
      proposalId: p.id,
      propertyAddress: p.property_address,
      clientName: p.client_name,
      priority: daysSinceSent >= 7 ? 'high' : 'medium',
      createdAt: p.sent_at,
      read: readKeys.has(key),
    })
  }

  // 3. Viewed proposals that need follow-up (viewed but not approved, > 1 day)
  const viewedNeedAction = db.prepare(`
    SELECT p.id, p.client_name, p.property_address, p.viewed_at
    FROM proposals p
    WHERE p.status = 'viewed'
      AND p.viewed_at IS NOT NULL
      AND julianday('now') - julianday(p.viewed_at) >= 1
    ORDER BY p.viewed_at ASC
  `).all() as { id: string; client_name: string; property_address: string; viewed_at: string }[]

  for (const p of viewedNeedAction) {
    const key = `viewed_followup:${p.id}`
    if (dismissed.has(key)) continue
    notifications.push({
      key,
      type: 'viewed',
      title: 'proposal viewed',
      description: `${p.client_name} viewed the proposal -- time to follow up`,
      proposalId: p.id,
      propertyAddress: p.property_address,
      clientName: p.client_name,
      priority: 'medium',
      createdAt: p.viewed_at,
      read: readKeys.has(key),
    })
  }

  // 4. Recently approved proposals (celebrate / next steps)
  const recentApproved = db.prepare(`
    SELECT p.id, p.client_name, p.property_address, p.approved_at
    FROM proposals p
    WHERE p.status = 'approved'
      AND p.approved_at IS NOT NULL
      AND julianday('now') - julianday(p.approved_at) < 2
    ORDER BY p.approved_at DESC
  `).all() as { id: string; client_name: string; property_address: string; approved_at: string }[]

  for (const p of recentApproved) {
    const key = `approved:${p.id}`
    if (dismissed.has(key)) continue
    notifications.push({
      key,
      type: 'approved',
      title: 'proposal approved',
      description: `${p.client_name} approved -- ready for next steps`,
      proposalId: p.id,
      propertyAddress: p.property_address,
      clientName: p.client_name,
      priority: 'low',
      createdAt: p.approved_at,
      read: readKeys.has(key),
    })
  }

  // 5. New proposals created in last 24h
  const newProposals = db.prepare(`
    SELECT p.id, p.client_name, p.property_address, p.created_at
    FROM proposals p
    WHERE p.status = 'draft'
      AND julianday('now') - julianday(p.created_at) < 1
    ORDER BY p.created_at DESC
  `).all() as { id: string; client_name: string; property_address: string; created_at: string }[]

  for (const p of newProposals) {
    const key = `new_proposal:${p.id}`
    if (dismissed.has(key)) continue
    notifications.push({
      key,
      type: 'new_proposal',
      title: 'new proposal created',
      description: `${p.property_address} for ${p.client_name}`,
      proposalId: p.id,
      propertyAddress: p.property_address,
      clientName: p.client_name,
      priority: 'low',
      createdAt: p.created_at,
      read: readKeys.has(key),
    })
  }

  // Sort: unread first, then by priority, then by date
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  notifications.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1
    if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority]
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount }
}

export async function GET() {
  try {
    const db = getDb()
    const result = buildNotifications(db)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Notifications API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { action, keys } = body as { action: 'dismiss' | 'read' | 'mark_all_read'; keys?: string[] }

    if (action === 'dismiss' && keys && keys.length > 0) {
      const stmt = db.prepare('INSERT OR IGNORE INTO notification_dismissals (notification_key) VALUES (?)')
      const tx = db.transaction(() => {
        for (const key of keys) {
          stmt.run(key)
        }
      })
      tx()
      return NextResponse.json({ success: true, dismissed: keys.length })
    }

    if (action === 'read' && keys && keys.length > 0) {
      const stmt = db.prepare('INSERT OR IGNORE INTO notification_reads (notification_key) VALUES (?)')
      const tx = db.transaction(() => {
        for (const key of keys) {
          stmt.run(key)
        }
      })
      tx()
      return NextResponse.json({ success: true, read: keys.length })
    }

    if (action === 'mark_all_read') {
      const { notifications } = buildNotifications(db)
      const unreadKeys = notifications
        .filter(n => !n.read)
        .map(n => n.key)

      if (unreadKeys.length > 0) {
        const stmt = db.prepare('INSERT OR IGNORE INTO notification_reads (notification_key) VALUES (?)')
        const tx = db.transaction(() => {
          for (const key of unreadKeys) {
            stmt.run(key)
          }
        })
        tx()
      }
      return NextResponse.json({ success: true, read: unreadKeys.length })
    }

    return NextResponse.json({ error: 'Invalid action. Use: dismiss, read, or mark_all_read' }, { status: 400 })
  } catch (error) {
    console.error('Notifications POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process notification action' },
      { status: 500 }
    )
  }
}
